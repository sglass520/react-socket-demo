# Ionc React Sockets Demo

# Client

```
npm install --save socket.io-client
npm install --save @types/socket.io-client
npm install --save uuidv4
npm install --save react-hook-form
```

# Server

```
npm init
npm install express --save
npm install socket.io --save
npm install -g nodemon --save
npx nodemon app.js
```

## Google Cloud Server

Please refer to [Bitnami LAMP stack documentation](https://docs.bitnami.com/google/infrastructure/lamp/) for further questions not answered in this README.

### 1. Create VM instance

Create a VM instance using `LAMP Certified by Bitnami` in the Google Cloud Marketplace. This instance is free and includes the LAMP stack and other tools to make deployment easier.

### 2. Add static external IPv4 address

Follow [Google Cloud Docs](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address) to change ephemeral IP address to a static IP address.

### 3. Modify DNS for hostname

Modify the DNS to point to a domain name instead of using the IP address.

- In domain DNS zone editor create a new A record with server external IP address

### 4. Generate SSH key pair

Follow [Bitnami Documention](https://docs.bitnami.com/google/faq/get-started/connect-ssh/) which provides a good tutorial on generating a private key using `PuTTYgen` and adding it to trusted keys on the Google Cloud server. This README will use `MobaXterm` for SSH, SFTP, and tunneling.

### 5. Access server

`MobaXterm` is used to access the server via SSH, SFTP and tunneling services.

- Create a new SSH and SFTP session using the default username `bitnami` and specifying your private key in the advanced settings tab for the session you are creating. The DNS resolved hostname or external IP address can be used for the hostname.
- Password is the private key passphrase.

### 6. Create tunnel

A tunnel is created using `MobaXterm` because by default you must be on the server local network (localhost) to access PHPMyAdmin. Ensure your private key is selected for the tunnel.

- Create and start a tunnel
  - Type: Local
  - Forward Port: 8888
  - Destination Server: localhost:80
  - SSH server: bitnami@\<ip\>

### 7. Modify MySQL admin password

Using SSH session:

```
/opt/bitnami/mysql/bin/mysqladmin -p -u root password NEW_PASSWORD
```

Note: Default password is temporary password provided on VM instance creation.

Reference: [Bitnami Documentation](https://docs.bitnami.com/google/infrastructure/lamp/administration/change-reset-password/)

### 8. Secure MySQL

By default any remote host can connect to our MySQL server if they have the password. Because we have local API, only our `localhost` should be able to connect to the database.

1. Log in to PHPMyAdmin (must be tunneled)
2. Navigate to `user` table in `mysql` database
3. Copy existing `root` twice.
4. Modify `hosts` column for each `root` user to hosts `localhost`, `127.0.0.1`, `::1`.

### 9. Install Node.js

Using SSH session:

```
cd ~
curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt install -y nodejs
node --version && npm --version
sudo apt install build-essential
```

### 10. Google Cloud Firewall

Create firewall rule in Google Cloud console to allow connections to Express server.

- VPC Network -> Firewall
- Add rule to allow connections to port for IP range 0.0.0.0/0

### 10. Dependencies

Allow Port 4001 TCP connection

```
iptables -I INPUT -p tcp --dport 4001 -j ACCEPT
sudo mkdir /opt/socket-demo-server
sudo chown bitnami:bitnami /opt/socket-demo-server
```

```
sudo npm install -g forever
forever start /opt/socket-demo-server/forever.json
```

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
sudo apt-get install php php-mysql libapache2-mod-php
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
