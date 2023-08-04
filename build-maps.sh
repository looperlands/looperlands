#!/bin/bash
cd tools/maps
python2 ./export.py server multi && python2 ./export.py client multi
