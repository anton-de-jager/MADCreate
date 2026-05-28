#!/usr/bin/env bash
# Install the four madcreate Apache vhost files and issue Let's Encrypt certs.
# Run on the DreamCompute box as a user with sudo (e.g. madprospects).
#
# Usage (from the box):
#   cd /home/madprospects
#   bash install.sh
#
# Or one-shot from your laptop (after deploy.ps1 has uploaded apache/ via SFTP):
#   ssh madprospects@41.185.110.61 'bash /home/madcreate-api/apache/install.sh'

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
echo "Installing vhost files from $HERE..."

# 1. Drop the four files into sites-available and enable them.
for f in madcreate.madprospects.com.conf madcreate.madprospects.com-le-ssl.conf \
         madcreateapi.madprospects.com.conf madcreateapi.madprospects.com-le-ssl.conf; do
  echo "  -> /etc/apache2/sites-available/$f"
  sudo cp "$HERE/$f" "/etc/apache2/sites-available/$f"
done

# 2. Enable HTTP vhosts FIRST (the HTTPS ones need certs that don't exist yet).
sudo a2ensite madcreate.madprospects.com.conf
sudo a2ensite madcreateapi.madprospects.com.conf

# 3. Ensure required modules are on.
sudo a2enmod proxy proxy_http rewrite headers ssl

# 4. Test + reload.
sudo apache2ctl configtest
sudo systemctl reload apache2

# 5. Issue certs (uses HTTP-01 challenge; the HTTP vhosts must already be live).
echo ""
echo "Requesting Let's Encrypt certificates..."
sudo certbot --apache \
  -d madcreate.madprospects.com \
  -d madcreateapi.madprospects.com \
  --non-interactive --agree-tos -m admin@madprospects.com --redirect

# 6. Enable the HTTPS vhosts (certbot --apache already does this if it wrote
#    its own -le-ssl.conf; otherwise enable the ones we shipped).
if [[ ! -L /etc/apache2/sites-enabled/madcreate.madprospects.com-le-ssl.conf ]]; then
  sudo a2ensite madcreate.madprospects.com-le-ssl.conf
fi
if [[ ! -L /etc/apache2/sites-enabled/madcreateapi.madprospects.com-le-ssl.conf ]]; then
  sudo a2ensite madcreateapi.madprospects.com-le-ssl.conf
fi

sudo apache2ctl configtest
sudo systemctl reload apache2

echo ""
echo "Done. Verify:"
echo "  curl -I https://madcreate.madprospects.com/"
echo "  curl -I https://madcreateapi.madprospects.com/v1/health"
