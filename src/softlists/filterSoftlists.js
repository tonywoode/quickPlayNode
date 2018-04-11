'use strict'

const fs    = require('fs')
const R     = require('ramda')
const Leven = require('levenshtein')

module.exports = (hashDir, log) => softlistEmus => {

  /* Sometimes a softlist exists for a device that isn't supported in the version of mess e.g.: in mess 0.163, 
   *  a2600 doesn't have a cass, but there exists a cass softlist, which will silently fail if called. 
   *   So, try and get the device from the softlist name and check. Considerations:
   *     1) There's no point in looking in a softlist xml for devices it's about, unless you want to try and parse the free text 'name' field
   *     2) Some softlist names don't have a postfix, but we're assuming we don't 'need' the device name 
   *       (ie: assuming that no postfix means they will load in the default device)
   *     3) some postfixes are not about the device - we've got _a1000, _workbench, _hardware
   *       (with a bit of luck most of these are unsupported or not games anyway, we'll need to make a list) */ 

  const addDeviceType = R.pipe(
      //grab the device or declare there is none specified
      R.map( obj => (R.assoc(`deviceTypeFromName`, obj.name.split(`_`)[1]? obj.name.split(`_`)[1] : `no_postfix`, obj)))
      //get system type from softlist name, needed immediately and later
    , R.map( obj => (R.assoc(`systemTypeFromName`, obj.name.split(`_`)[0], obj)))

      //FM7's disk softlist breaks the  rule and is called 'disk'. They are just floppy images, they work fine
    , R.map( obj => (obj.deviceTypeFromName === `disk`? obj.deviceTypeFromName = `flop`: obj.deviceTypeFromName, obj))
      //ditto epson_cpm, some of which really are games
    , R.map( obj => (obj.deviceTypeFromName === `cpm`? obj.deviceTypeFromName  = `flop`: obj.deviceTypeFromName, obj))
      //ditto for HP Integral Personal Computer, a couple are games 
    , R.map( obj => (obj.deviceTypeFromName === `ipc`? obj.deviceTypeFromName = `flop`: obj.deviceTypeFromName, obj))
      //ditto for the Thomson MO/TO qd floppies. They're floppies (though the first few in mo5_qd are mixed cart and floppy but no games 
    , R.map( obj => (obj.deviceTypeFromName === `qd`? obj.deviceTypeFromName = `flop`: obj.deviceTypeFromName, obj))
      //ditto for the Dragon flex floppies 
    , R.map( obj => (obj.deviceTypeFromName === `flex`? obj.deviceTypeFromName = `flop`: obj.deviceTypeFromName, obj))
      //ditto for the Dragon 0s9 diskettes 
    , R.map( obj => (obj.deviceTypeFromName === `os9`? obj.deviceTypeFromName = `flop`: obj.deviceTypeFromName, obj))
      //ditto for Timex Sinclair TS-2068
    , R.map( obj => (obj.deviceTypeFromName === `dock`? obj.deviceTypeFromName = `cart`: obj.deviceTypeFromName, obj))
      //i note some lists called hdd and some softlists called 'hard1`, `hard2`, guess for later (there are no matches atm)
    , R.map( obj => (obj.deviceTypeFromName === `hdd`? obj.deviceTypeFromName  = `hard`: obj.deviceTypeFromName, obj))
      // I suspect all the nes softlist will run on all systems, essentially its postfixes aren't about mess `devices`
      // Note that the same isn't true for Famicom, as there seems to be a genuine problem that Famicoms don't have cass or flops
    , R.map( obj => (obj.systemTypeFromName === `nes`? obj.deviceTypeFromName  = `no_postfix` : obj.deviceTypeFromName, obj))
      //I suspect the same is true of the superfamicom devices bspack and strom, these aren't device names in the same way as flop or cass
    , R.map( obj => (obj.systemTypeFromName === `snes`? obj.deviceTypeFromName = `no_postfix` : obj.deviceTypeFromName, obj))
  )(softlistEmus)

  
  //return a list of devices without the number in their briefname, so we can tell if the machine for a 'cart' softlist actually has a working 'cart' device
  const supportedDevices = deviceList => R.map(device => R.head(device.split(/[0-9].*/)) , deviceList)

  //make a k-v in the object to tell us if the softlist we've made can actually run. If the softlist has no postfix, we assume it will run
  // (an example is a2600.xml as the softlist name, which if you read the text description says its for 'cart')
  const deviceExists = R.map( obj => (
        R.assoc(`doesSoftlistExist`, obj.deviceTypeFromName === `no_postfix`? 
          true : R.contains(obj.deviceTypeFromName, supportedDevices(obj.device)), obj)
  ), addDeviceType)

  //make exception or remove those softlists that say that the softlist device doesn't actually exist
  const alertProblemDevices = R.map( 
    obj => obj.doesSoftlistExist? obj : log.deviceProblems && console.log(
        `DEVICE PROBLEM: ${obj.displayMachine} has a softlist called ${obj.name} but doesn't have a ${obj.deviceTypeFromName}`
      )
  , deviceExists)
  
  // now remove them
  const removedProblemDevices = R.filter( obj => obj.doesSoftlistExist === true, deviceExists)

  //make a k-v telling us if list exists on disk - is the softlist found in the softlist directory
  const softlistFileExists = R.map( obj => (
      R.assoc(`doesSoftlistFileExist`, fs.existsSync(`${hashDir}${obj.name}.xml`), obj)
    )
  , removedProblemDevices)

  //alert those that dont exist
  const alertNonExistentSoftlistFile = R.map( 
    obj => obj.doesSoftlistFileExist === true? 
      obj : log.fileProblems && console.log(
        `FILE PROBLEM: ${obj.displayMachine} has a softlist called ${obj.name} but there's no file called "${hashDir}${obj.name}.xml`
      )
    , softlistFileExists)
 
  //remove softlists with no softlist file in hashes dir
  const removedNonExistingLists = R.filter( obj => obj.doesSoftlistFileExist === true, softlistFileExists)

 
  /* The best match for many softlists will that the call for the machine matches the prefix of the softlist - a2600
   * There is then some utility to be gained for similarity in substrings. So rate the similarity */ 

  //get the edit distance of every softlist system to the softlist prefix
  const getDistance = (call, namePrefix) => {
    const l = new Leven(call, namePrefix)
    let round = 0
    if (l.distance === 0) round =  40
    if (l.distance === 1) round =  30
    if (l.distance === 2) round =  15
    if (l.distance === 3) round =  10
    if (l.distance === 4) round =   5
    if (l.distance === 5) round = -10
    if (l.distance === 6) round = -25
    if (l.distance === 7) round = -30
    if (l.distance >= 8)  round = -40
 
    return round
  }

  // two things at once - we start a rating for each object at 50, but then use the Levenshtein distance to immediately make it useful
  const addedRatings =  R.map( 
    obj => (R.assoc(`rating`, 50 + getDistance(obj.call, obj.systemTypeFromName), obj)), removedNonExistingLists
  )

  //now any emu that is a clone gets reduced in rating by 40 (problem here is we lose accuracy if there are clone trees, i'm not sure if there are)
  const deRateClones = R.map(obj => obj.cloneof? (obj.rating -= 90 , obj): obj, addedRatings)
  
  /* There are some issues that prevent games from working, make it difficult for games to work, or break reasonable expectations I later want to rely on in the code 
   *  (a system's softlist should be the same system type as the system its running) 
   *  So manually pick these now by bumping their ratings */

  const  ratingLens = R.lensProp('rating')
  const  setHigh = R.set(ratingLens, 100)

  //Some softlists are best used with particular systems, for reasons that are not easily computable. An example is
  //  we want to use an msx which doesn't present its menus in japanese (as its impossible to work out how to load
  //  the game)
  const softlistSystemOverrides = [
    {   "softlist" : "apple2"
      , "system"   : "apple2e" 
      , "comment"  : "Cannot figure out how to load from the corrupt-looking original apple2 dos. Apple2e just works for loading games"
    },
    {   "softlist" : "msx1_flop"
      , "system"   : "expertdp" 
      , "comment"  : "by default Leven will pull up an MSX2 as the best MSX1_flop emu, which bizarrely is actually correct. The msx1 flppy drive ws a rare external periphereal, and most all MSX1_flop emus aren't 2 sided-disks, yet the softlist set are all double-density!, so they crash MAME. But we rely later on systems being Original or compatible in the duplicate-mamename checking code, so we need an MSX1 to play MSX1 games. Gradiente Expert DD Plus(Brazil) (MSX!) works fine, I think because the Brazilian stiuff is always years later, by that time the disk drive was DD."
    },
    {   "softlist" : "msx2p_flop" 
      , "system"   : "hbf1xv"
      , "comment"  : "else we end up at 'that' panasonic japanese loading menu, which is impossible to comprehend...SONY HB-F1XV (Japan) (MSX2+) seems to load many things fine"
    },
    {   "softlist" : "wscolor"
      , "system"   : "wscolor"
      , "comment"  : "else the picker chooses the wonderswan (wswan), which is available because it had a mode to play color games"
    },
    {   "softlist" : "bk0010"
      , "system"   : "bk001001"
      , "comment"  : "all the Elektronica BK-0010 softlist games need to run with the Elektronica BK-0010-01 or else none of the load commands that mame specify are recognised"
    },
    {   "softlist" : "ondra"
      , "system"   : "ondrav"
      , "comment"  : "some games e.g.: Galaxian won't work on ondrat but will on the  vili (just the newer ondra)"
    },
    {   "softlist" : "intvecs"
      , "system"   : "intvecs"
      , "comment"  : "we pick intv by default. The ecs had a keyboard and these games need a keyboard (see comments). TODO: is this a bug as the ecs is only a compatible softlist with the softlist intvecs"
    },
    {   "softlist" : "orao"
      , "system"   : "orao103"
      , "comment"  : "the basic orao can't load cassettes because the driver is bugged, nor can you type double quotes to load casettes, needs to be orao103"
    },
    {   "softlist" : "svi328"
      , "system"   : "svi318_cass"
      , "comment"  : "many of the cass games (eg: konami's tennis) actually need an svi-328 to work (even if you up the memory on the 318 it still doesn't work). "
    },
    {   "softlist" : "coco_cart"
      , "system"   : "coco3"
      , "comment"  : "a lot of the coco games comments say 'coco3 only'. In fact we picked coco3 on mame 0.187, but its worth explicitly setting"
    },
    {   "softlist" : "coco_flop"
      , "system"   : "coco3"
      , "comment"  : "same reason as coco_cart"
    },
    {   "softlist" : "ti99_cart"
      , "system"   : "ti99_4a"
      , "comment"  : "the ti99 seems to display only a choice to load basic when a cart is inserted. the messinfo says that a few games only require the 4a but it seemed a wider issue. Since we autoselected the us version of the 99_4, lets hardcode the us version of the 4a"
    },
    {   "softlist" : "to_flop"
      , "system"   : "to8"
      , "comment"  : "this softlist seems a mix of to7-ish and to8-ish games, the to8 should load them all"
    },
    {   "softlist" : "to7_qd"
      , "system"   : "to8"
      , "comment"  : "these are easy to load on the to8 and seemed impossible to load on the to7"
    }
  ]

  //When passed a softlist and a system, ensures that system in the systems list will get selected for that softlist
  const hardCodeASoftlistsSystem = (softlist, system, systems) => R.map( obj => {
    return obj.name === softlist && obj.call === system? setHigh(obj) : obj
  }, systems)
  //passes each softlist override in turn to the function above, needs override array-of-objects with softlist:systems kv's
  const hardCodeDefaults = softlistSystemOverrides.reduce( (systemsAccum, overrideItem) => hardCodeASoftlistsSystem(overrideItem.softlist, overrideItem.system, systemsAccum), deRateClones)

  return hardCodeDefaults

}
