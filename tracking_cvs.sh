#!/bin/bash
CVSROOT=":pserver:guest@mozdev.org:/cvs"
CVSMODULE=gcontactsync
git cvsimport -r cvs -d $CVSROOT $CVSMODULE
##git cvsimport -d $CVSROOT -C gcvs -r cvs -k gcontactsync
