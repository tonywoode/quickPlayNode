# **quickPlayNode**

This is a combination of tools for the backend functions of a retrogaming frontend. Currently exclusively used with [QuickPlay Frontend](http://quickplay.sourceforge.net/) and built as a compiled windows exe using [pkg](https://github.com/vercel/pkg) (a couple of native modules must be manually included with the build)

## **mametool**

MAME is the combination of two projects: [MAME](https://www.mamedev.org/) for arcade systems, and [MESS](http://mess.redump.net/) for other computing devices (inc. consoles, PCs, embedded systems). They are different beasts. The core of mametool's functionality is to:

1. Create frontend configuration files for MAME's arcade sets, running from [RetroArch](https://www.retroarch.com/) or standalone. This process is about allowing the user to create filtered lists of arcade games according to their preference
1. Create frontend configuration files for MAME/MESS' non-arcade sets, running from RetroArch or standalone (formerly known as  messtool). This process is about enforcing rules to omit non-gaming, non-working, incorrectly-configured games and systems from a large unwieldy collection, leaving users with nicely-segmented lists of hundreds of thousands of playable games from all sorts of devices from the history of computing. The 'filepaths' functionality allows users to play games with ANY emulator, not just MAME (often important to a frontend's userbase because MAME/MESS' goal is emulation rather than ease of playing games)

### Inputs

Find in inputs/current these MAME-related files (from the version of mame last used for dev work -  0.241 at the time of writing):

* #### [MAME](https://www.mamedev.org/) Standard Inputs

  1. 'folders' folder - this is a folder of ini files kept in a subfolder of MAME's root, named 'EXTRAs', they can be found online individually, but its best to find them together eg: [at the internet archive](https://archive.org/details/MAME_0.185_EXTRAs)
  1. 'hash' folder - can be directly downloaded as part of [MAME](http://mamedev.org/release.html) or [SDLMame](http://sdlmame.lngn.net/) (find it in those project's root)
  1. the `mame.xml` download MAME and run `--listxml` and pipe the output to a file, or can be directly downloaded at [MAME](http://mamedev.org/release.html) by downloading the 'mame.*x' file tagged 'MAME 0.[0-9]{3} full driver information in XML format.'

* #### Frontend Standard Inputs: [QuickPlayFrontend](http://quickplay.sourceforge.net/)

  1. Path and filter settings for MAME - [settings.ini](https://github.com/tonywoode/quickPlay/blob/master/src/uSettings.pas) - the 'MAME' key of QuickPlay's settings ini. The frontend needs to tell the backend things like what MAME Emulator it wants to use (useful to change MAMEToolExeName and MAMEToolExePath between Retroarch Mame and Mame direct)
  1. list of systems supported - [systems.dat](https://github.com/tonywoode/quickPlay/blob/master/src/Defaults%20Resource/systems.dat) note MAME does not support all systems a frontend will, hence we must augment the frontend's list with MAME's growing list of supported systems

* #### [MAME File Manager](https://github.com/phweda/MFM) Filter file

  1. Plaintext file with one arcade game basename ('mamename') per line (users often like to only print the roms they have, rather than all the roms from MAME's XML. When users want this, they really want it). Really any method can be used to make this file (ie: a filtered dir listing)

### mametool dev Usage

`npm start`: see usage. There's two separate processes that can be tested together or in isolation:
  
  1. SAX-parsing the (enourmous) mame.xml and creating:
     * a serialised JSON store of interesting data: `mame.json`
     * a list of emulators MAME provides, both for running its own games and standalone emulators: `EFind.ini`
     * an augmentation of the frontends systems list with new systems MAME provides: `systems.dat`
  2. Reading MAME's game lists for arcade (`mame.json`) or non-arcade (`hash/{system}.xml`), and printing data-rich frontend configuration files for each (`romdata.dat`). There's considerations like the need to determine the region of a game from its filename because certain games will only run with certain region's emulated systems

  We are able to run (2) as an integration test without having to run (1) each time, since (2) uses caches of (1)'s outputs (this is the production use case). Note also the convenience flag `--full` will delete the dev outputs folder

`npm test`: due to the different nature of MESS vs MAME, unit tests make a lot of sense for the Arcade process, but less sense for the data-driven and rather changable MESS process, for which we rely on the integration tests

### Additional mametool functions

* getRomPath - the frontend will need to know what the user has setup in MAME for each of the very separate rom filetypes, so we present a call to provide this from the MAME settings file on the user's pc. But we absolute the paths returned since a frontend will need the absolute versions, rather than having to insert mame's installation directory if a relative path is seen

## **Synctool**

A monadic-FP library for caching the latest version of roms locally from whatever the user decides is an external source of roms. Because we are game collectors, we sync SINGLE files (ie: zips)

synctool's inputs are all user strings specifying the local and remote paths, and which machines we want synctool to operate on (its not a feature for desktop pcs). These are all GUI concerns, and to seperate this config from any particular frontend, a simple [Electron](https://www.electronjs.org/) app is included, whose simple html config allows it to display on screen quicker than one of the frontend's native forms)

### Additional functions

  1. romdata flip - you're likely to want to initially scan your games on a machine whose storage natively hosts your games, and then 'flip' the filepaths (change them to the remote store) for consumption on all other pcs, this is a simple regex to do that using the app's path configuration to compose the regex