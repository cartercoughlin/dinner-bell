#!/bin/sh
set -e

python manage.py migrate --noinput
gunicorn dinnerbell.wsgi:application --bind 0.0.0.0:8000
