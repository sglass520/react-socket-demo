## Debian 10 Setup

```
adduser stephen
usermod -aG sudo stephen
cp -r ~/.ssh /home/stephen
chown -R stephen:stephen /home/stephen/.ssh
```

Remote root ssh keys when completed and verified.

[Reference: Digital Ocean](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-debian-10)

### 1. Install Apache

```
sudo apt-get update
sudo apt-get install apache2
```

### 2. Install PHP, MySQL

```
sudo apt-get install mariadb-server
mysql_secure_installation
sudo apt-get install php php-mysql php-mysqli libapache2-mod-php
```

### 3. Create Virtual Host

```
mkdir /var/www/cloud.stephen.glass
cd /etc/apache2/sites-available
cp 000-default.conf cloud.conf
```

Modify `cloud.conf` to reflect new directory and domain.

```
sudo a2ensite cloud.conf
sudo a2dissite 000-default.conf
sudo apach2ctl configtest
sudo systemctl restart apache2
```

### 4. Install Certificate

```
sudo apt-get install certbot python-certbot-apache
sudo certbot --apache
```

[Reference: Digital Ocean](https://www.digitalocean.com/community/tutorials/how-to-install-the-apache-web-server-on-debian-10)

### 5. PhpMyAdmin

- Install PhpMyAdmin

```
sudo apt-get install php-cgi php-mysqli php-pear php-mbstring php-gettext php-common php-phpseclib php-zip php-gd
curl -sL https://files.phpmyadmin.net/phpMyAdmin/5.0.2/phpMyAdmin-5.0.2-all-languages.tar.gz -o phpMyAdmin-5.0.2-all-languages.tar.gz
tar xvf phpMyAdmin-5.0.2-all-languages.tar.gz
sudo mv phpMyAdmin-5.0.2-all-languages/ /usr/share/phpmyadmin

sudo mkdir -p /var/lib/phpmyadmin/tmp
sudo chown -R www-data:www-data /var/lib/phpmyadmin
sudo cp /usr/share/phpmyadmin/config.sample.inc.php /usr/share/phpmyadmin/config.inc.php
```

- Modify `config.inc.php` set `$cfg['blowfish_secret']` to random 32 character string.
- Add the following line:

```
$cfg['TempDir'] = '/var/lib/phpmyadmin/tmp';
```

- Create new MySQL user to access PhpMyAdmin (root is not allowed)

```
mysql CREATE USER 'phpmyadmin'@'localhost' IDENTIFIED BY '<password>';
GRANT ALL PRIVILEGES ON *.* TO 'phpmyadmin'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

- Create a file named `phpmyadmin.conf` in the `/etc/apache2/conf-available/` directory

```
# phpMyAdmin default Apache configuration

Alias /phpmyadmin /usr/share/phpmyadmin

<Directory /usr/share/phpmyadmin>
    Options SymLinksIfOwnerMatch
    DirectoryIndex index.php
    AllowOverride All

    <IfModule mod_php5.c>
        <IfModule mod_mime.c>
            AddType application/x-httpd-php .php
        </IfModule>
        <FilesMatch ".+\.php$">
            SetHandler application/x-httpd-php
        </FilesMatch>

        php_value include_path .
        php_admin_value upload_tmp_dir /var/lib/phpmyadmin/tmp
        php_admin_value open_basedir /usr/share/phpmyadmin/:/etc/phpmyadmin/:/var/lib/phpmyadmin/:/usr/share/php/php-gettext/:/usr/share/php/php-php-gettext/:/usr/share/javascript/:/usr/share/php/tcpdf/:/usr/share/doc/phpmyadmin/:/usr/share/php/phpseclib/
        php_admin_value mbstring.func_overload 0
    </IfModule>
    <IfModule mod_php.c>
        <IfModule mod_mime.c>
            AddType application/x-httpd-php .php
        </IfModule>
        <FilesMatch ".+\.php$">
            SetHandler application/x-httpd-php
        </FilesMatch>

        php_value include_path .
        php_admin_value upload_tmp_dir /var/lib/phpmyadmin/tmp
        php_admin_value open_basedir /usr/share/phpmyadmin/:/etc/phpmyadmin/:/var/lib/phpmyadmin/:/usr/share/php/php-gettext/:/usr/share/php/php-php-gettext/:/usr/share/javascript/:/usr/share/php/tcpdf/:/usr/share/doc/phpmyadmin/:/usr/share/php/phpseclib/
        php_admin_value mbstring.func_overload 0
    </IfModule>

</Directory>

# Authorize for setup
<Directory /usr/share/phpmyadmin/setup>
    <IfModule mod_authz_core.c>
        <IfModule mod_authn_file.c>
            AuthType Basic
            AuthName "phpMyAdmin Setup"
            AuthUserFile /etc/phpmyadmin/htpasswd.setup
        </IfModule>
        Require valid-user
    </IfModule>
</Directory>

# Disallow web access to directories that don't need it
<Directory /usr/share/phpmyadmin/templates>
    Require all denied
</Directory>
<Directory /usr/share/phpmyadmin/libraries>
    Require all denied
</Directory>
<Directory /usr/share/phpmyadmin/setup/lib>
    Require all denied
</Directory>
```

- Create `.htaccess` for PhpMyAdmin

```
sudo nano /usr/share/phpmyadmin/.htaccess
```

```
Require local
```

- Restart

```
sudo systemctl restart apache2
```

[Reference: Digital Ocean](https://www.digitalocean.com/community/tutorials/how-to-install-phpmyadmin-from-source-debian-10)

### 6. Install Node.js

```
cd ~
curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt install -y nodejs
node --version && npm --version
sudo apt install build-essential
```

## Notes

- Generating SSH key pair: Follow [Bitnami Documention](https://docs.bitnami.com/google/faq/get-started/connect-ssh/) which provides a good tutorial on generating a private key using `PuTTYgen` and adding it to trusted keys on the Google Cloud server.
- Create firewall rule in Google Cloud console to allow connections to express server
  - VPC Network -> Firewall
  - Add rule to allow connections to port for IP range 0.0.0.0/0
- Duplicate MySQL root user to have a one with `host` of `localhost` and `127.0.0.1`
- To access PhpMyAdmin externally, you must tunnel to the server using a tool like MobaXterm. Create a tunnel:
  - Type: Local
  - Forward Port: 8888
  - Destination Server: localhost:80
  - SSH server: <user>@\<ip\>
- For external MySQL connections, a new user will need to be created with correct `hosts` and permissions.
