import sys
#not sure of a better way to do this with a relative path
sys.path.insert(0,'/var/www/html/python-gallery')
from server import app as application
