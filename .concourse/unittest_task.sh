#!/bin/sh

set -e

cd wildbutton
npm ci
npm test
