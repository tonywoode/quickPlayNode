'use strict'

const R                    = require('ramda')
//const {needsARomToLoad} = require('../../messFilters.json')

/* we want a single set of data to replace both softlist calls and device calls: as the imp is different, 
 *   yet the systems affected often need both softlists and device emulators (e.g.: the cassette emulator for the to7) 
 *   patching for a loader call.
 * Naively it seems looking up systems which run a particular softlist will be trivial, but a problem arises when 
 *   e.g.: the to8 runs the to7 cassette softlist. The to7 needed its basic cart to be inserted
 *   but the to8 included its own built-in basic. Essentially the loader call is about the machine software is running on,
 *   and the device being loaded, the call made doesn't follow the softlist. 
 * A third factor is that we need the application to be as wide-randing as possible: we DO want clones of the to7, and
 *   systems with 'original' (as opposed to 'compatible') support for its softlists (eg: snes and snes_pal) to have the loader call added, so the
 *   caller needs to look for these (looking for 'original' softlists aslo solves the previous problem). We use 'cloneof' instead of system type
 *   because, e.g.: the to8 and to7 are both members of 'Thomson TO-series'
 *
 *

/* So to describe the data structure, in the case of apfimag, we need to patch both the softlist cassette emulator and the cassette emulator. 
 *   We first use the softlist key to add romcall to that softlist in original systems, then we use both the calls and the device key to add romcall 
 *   to the cassette emulator.  
 * A corner case, thomson to8 lists the softlist to7_cart as an original system, but to7_cass as a compatible, luckily that suits our purposes
 * TODO: calls and device always need each other, and it may be that a system needs the same loader for both cass and floppy 
  * (Thomson TO-series narrowly misses needing this), so maybe the value of calls should be an object containing devices
//but then you need to iterate over calls (not doing atm) - how am i going to do to7's cass and floppy which both need the basic cart?
*/
//also its such a shame the softlist calls apply so generically to systems that 'have' the softlist. We could get a similar effect by using cloneof as well as call 
//ie: look for the system to8 or clones of to8 and then look for our device in all of those
const needsARomToLoad = [
  {   'calls'    : ['apfimag']
    , 'softlist' : 'apfimag_cass'
    , 'device'   : 'cass'
    , 'romcall'  : 'cart basic'
  }, 
  {   'softlist' : 'nes_ade'
    , 'romcall'  : 'cart ade'
    , 'comment'  : 'you dont seem to need the -cart2 call here, though having it would also be fine'
  },
  {   'softlist' : 'nes_ntbrom' 
    , 'romcall'  : 'cart ntb'
    , 'comment'  : 'this romcall isnt valid. theres only two games'
  },
  {   'softlist' : 'nes_kstudio'
    , 'romcall'  : 'cart karaoke -cart2' 
    , 'comment'  : 'you need the cart2 call'
  },
  {   'softlist' : 'nes_datach'
    , 'romcall'  : 'cart datach -cart2'
    , 'comment'  : 'you need the cart2 call'
  },
  {   'softlist' : 'snes_bspack' 
    , 'romcall'  : 'cart bsx' 
    , 'comment'  : 'this romcall isnt valid. theres only one game'
  },
  {   'softlist' : 'snes_strom'
    , 'romcall'  : 'cart sufami -cart2'
    , 'comment'  : 'you need the cart2. there is another cart slot - youre supposed to combine games'
  },
  {   'calls'    : ['orion128'] 
    , 'softlist' : 'orion_cass'
    , 'device'   : 'cass'
    , 'romcall'  : 'cart ROMDISK'
    , 'comment'  : 'the calling function looks up clones too so should alter devices in orionide, orionidm, orionms, orionpro, orionz80 and orionzms'
  }, 
  {   'calls'    : ['sc3000', 'sg1000' ]
    , 'softlist' : 'sc3000_cass'
    , 'device'   : 'cass'
    , 'romcall'  : 'cart basic3e'
    , 'comment'  : 'sc-3000, sg-1000 and sf-7000 hopefully all the same underlying system. Why add sg1000 here if its a cloneof sc3000? To get the sg1000m2, a clone of the sg1000 (a subtely is the sg1000 doesnt have a cass, so it wont iteself get the loader call)'
  },
  {   'calls'    : ['to7', 'to770', 'to9'] 
    , 'softlist' : 'to7_cass'
    , 'device'   : 'cass'
    , 'romcall'  : 'cart basic'
    , 'comment'  : 'suspect the to770 and to9 will load cassettes with the same loader as the to7, but they are not cloneof for some reason (yet to7 softlists are original with them)'
  },
  {   'comment'  : 'caller must be able to cope with epmty objects'
  }
]


/* There are many systems that cannot load a game on some device (floppy/cassette) without bootstrapping code, 
 *   usually a basic cart or floppy, being inserted at the same time. Thanks to softlist names, we can automatically 
 *   provide this rom to the machine at the same time as loading from that media device, ie: we can call '-cart1 basic -flop1 %ROM%' 
 *   where 'basic' is the softlist name of loader media. We want to do this for both the softlist devices AND the normal emulators 
 *   (for they will not load the game without this rom anyway), so note it ties you to needing the softlist files for these 
 *   system's devices. 
 * We also need to remember to also patch any 'same gamename' conflict fixes with this same list 
 * (that's where a game exists on two seperate devices but mame wasn't good at representing this in softlists */

// we are going to need to know the index of the softlist, because each is an object and we need to attach the loader call key onto one of them
const doSoftlistsContainSoftlist = (softlistToFind, obj, log) => { 
    for (const [index, aSoftlist] of obj.softlist.entries()) { 
     log.loaderCallsVerbose && console.log(`  which has softlist ${aSoftlist.name}`)
      if (softlistToFind === aSoftlist.name && aSoftlist.status === `original`) return index
    }   
  }

/* as well as finding a match, we also need to make sure we have an ORIGINAL softlist not a COMPATIBLE one, 
 *   consider what would happen for Thomson TO8 with Thomson TO7's softlist, the TO8 doesn't need the basic cart, 
 *   and if it DID need a basic cart, it wouldn't need the same one as the TO7 */
const doesSystemHaveThisSoftlist = (obj, softlistToFind, log) => {
  log.loaderCallsVerbose && console.log(`looking for ${softlistToFind} in ${obj.call}`)
  if (obj.softlist) {return doSoftlistsContainSoftlist(softlistToFind, obj, log)}
}

/* pointfree takes systems list, searches for systems who have the (original) softlist we have loader rom info for, 
 * if found, inserts the call against the softlist so we can check for its existence later */
const fillSoftlistLoaderCalls = (romLoaderItem, log) => {
  log.loaderCalls && romLoaderItem['softlist'] && console.log(`LOADER CALLS: seeking matches for softlist ${romLoaderItem.softlist}`)
  return R.map( obj => {
  if (!(romLoaderItem['softlist'])) return obj //vs 'in' see: - https://stackoverflow.com/a/22074727/3536094
    const foundIndex = doesSystemHaveThisSoftlist(obj, romLoaderItem.softlist, log)
    return (foundIndex > -1)? ( 
        log.loaderCalls && console.log(`    ---> inserting a loading call for ${obj.call}'s original softlist ${romLoaderItem.softlist}`)
      , R.assocPath([`softlist`, foundIndex, `loaderCall`], `${obj.call} -${romLoaderItem.romcall}`, obj)
    )
    : obj
  })
}

/* a subtely here is that the system's device briefname may or may not have a number at the end. There's never likely 
 *   to be much variety in briefnames so the simplest substring check is fine */
const getIndexOfTheDevice = (obj, deviceToFind, log) => {
  for (const [index, device] of obj.device.entries()) {
    if (device.briefname.includes(deviceToFind)) {
      log.loaderCallsVerbose && console.log(`  --> found a match and the index for ${deviceToFind} in ${obj.call} is ${index}`)
      return index
    }
  }
}

const doesSystemHaveThisCall = (obj, callsToFind, deviceToFind, log) => {
  log.loaderCallsVerbose && console.log(`looking for ${callsToFind} with ${deviceToFind} as part of ${obj.call} and its clones`)
  if ((callsToFind.includes(obj.call)) || (callsToFind.includes(obj.cloneof) ) ) return getIndexOfTheDevice(obj, deviceToFind, log)
}

//pointfree takes systems list
const fillDeviceLoadingCalls = (romLoaderItem, log) => {
  log.loaderCalls && romLoaderItem['device'] && console.log(`LOADER CALLS: seeking matches for ${romLoaderItem.device} of ${romLoaderItem.calls.toString()}`)
  return R.map( obj => {
    if (!(romLoaderItem['device'])) return obj //note only checking device not calls, should really check both
    const foundIndex = doesSystemHaveThisCall(obj, romLoaderItem.calls, romLoaderItem.device, log)
    return (foundIndex > -1)? ( 
        log.loaderCalls && console.log(`    ---> inserting a loading call for ${obj.call}'s ${romLoaderItem.device}`)
      , R.assocPath([`device`, foundIndex, `loaderCall`], `${obj.call} -${romLoaderItem.romcall}`, obj)
    )
    : obj
  })
}

module.exports = log => systems => {
  //populate the systems list with the calls to rom loading media that some softlists always need
  const insertedSoftlistLoadingCalls = needsARomToLoad.reduce( 
    (systemsAccum, romLoaderItem) => fillSoftlistLoaderCalls(romLoaderItem, log)(systemsAccum)
  , systems)

  /* we can use those softlist romnames to also auto-insert the loading media for non-softlist emulators
   *   the principle is much the same, but we have to be much more granular with the systems we apply it to
   *   (because we can't use system type for the call as they are too general) */
  const insertedDeviceLoadingCalls = needsARomToLoad.reduce(
    (systemsAccum, romLoaderItem) => fillDeviceLoadingCalls(romLoaderItem, log)(systemsAccum)
  , insertedSoftlistLoadingCalls)

  return insertedDeviceLoadingCalls
}
