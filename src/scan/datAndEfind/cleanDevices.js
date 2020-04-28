'use strict'

const R                      = require('ramda')
const {uninterestingDevices} = require('../../messConfig.json')

module.exports = systems => {
  /* before the below applySpec, remove devices that don't have instances or supported extensions (theyre the same devices)
   * Both instances and extensions for devices can be empty according to the MAME DTD, and for whatever reason, in
   * MAME 220, a few were. Otherwise, the applySpec will create a spec for those devices, which causes subtle problems,
   * for instance creating an efind entry like this:
   *  [Retroarch Acorn BBC Micro Model B+ 128K -undefined (MAME)]
   *  HomePage=Supports: undefined
   *  param=-L cores\mame_libretro.dll " bbcbp128 -undefined \"%ROM%\""
   * note also the JSON.stringify serialisation when writing the mame.json will remove all undefined fields from devices,
   * so the undefined parts of the device will seem to disappear */
  const removedUselessDevices =  R.map(
    obj => R.assoc(`device`, R.filter(
      device => (device.instance && device.extension), obj.device) 
    , obj)
  , systems)

  const flattenExtensions = extensions => R.map(extension => extension.$.name, extensions)

  //note applySpec is currying in the device object without. You might want to key these by 'name' - see applySpec doc
  const template = R.applySpec({
    type       : R.path(['$', 'type']),
    tag        : R.path(['$', 'tag']),
    name       : R.path(['instance', '$', 'name']),
    briefname  : R.path(['instance', '$', 'briefname']),
    extensions : R.pipe(R.prop('extension'), flattenExtensions )
  })

  //Note that we fundamentally scrape the MAME xml for things that have devices so we don't need to check if they have a device element again
  //systems list -> system object -> device in object - nested looping into the devices key of one of the system objects
  const replaceDevice = R.map(
    obj => R.assoc(`device`, R.map(
      template, obj.device) //(you can always replace device => template(device) with just template)
    , obj)
  , removedUselessDevices)


  //there are device types like "printer" and "midiout" that we don't want to make an emulator for 
  const rejectDeviceTypes = device => R.contains(device.type, uninterestingDevices) 

  const removeUninterestingDevices = R.map(
    obj => R.assoc(`device`, R.reject(
      rejectDeviceTypes //no need to f => fn(f)
      , obj.device)
    , obj)
  , replaceDevice)
  
  return removeUninterestingDevices 

}
