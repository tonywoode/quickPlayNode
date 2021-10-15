# mametool
1) create frontend configuration files for the MAME emulator's arcade sets, running from RetroArch or standalone
2) create frontend configuration files for the MAME emulator's non-arcade sets, running from RetroArch or standalone (formerly known as  messtool)

## Inputs

Find in inputs/current these MAME-related files (from the version of mame last used for dev work - currently 220):

1. 'folders' folder - this is a folder of ini files kept in a subfolder of MAME's root, named 'EXTRAs', they can be found online individually, but its best to find them together eg: [at the internet archive](https://archive.org/details/MAME_0.185_EXTRAs)
2. 'hash' folder - can be directly downloaded as part of [MAME](http://mamedev.org/release.html) or [SDLMame](http://sdlmame.lngn.net/) and find it in the project root
3. the `mame.xml` download MAME and run `--listxml` and pipe the output to a file, or can be directly downloaded at [MAME](http://mamedev.org/release.html) by downloading the 'mame.*x' file tagged 'MAME 0.[0-9]{3} full driver information in XML format.'

And this file from [QuickPlayFrontend](http://quickplay.sourceforge.net/):

1. the current [systems.dat](https://github.com/tonywoode/quickPlay/blob/master/src/Defaults%20Resource/systems.dat) file from QuickPlayFrontend (a major goal of the quickPlayNode MAME automation is to augment this list with MAME's systems, as MAME omits some newer systems)
