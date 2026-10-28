#!/bin/bash
export PYTHONPATH="./site-packages:$PYTHONPATH"
python3 -m pytest tests/ "$@"
