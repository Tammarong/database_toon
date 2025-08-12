# Reset PostgreSQL Password

## Method 1: Using pgAdmin
1. Open pgAdmin
2. Right-click on PostgreSQL server
3. Select "Properties"
4. Go to "Connection" tab
5. Change password

## Method 2: Using Command Line
1. Stop PostgreSQL service:
   ```
   net stop postgresql-x64-17
   ```

2. Start PostgreSQL in single user mode:
   ```
   "C:\Program Files\PostgreSQL\17\bin\postgres.exe" --single -D "C:\Program Files\PostgreSQL\17\data" postgres
   ```

3. In the PostgreSQL prompt, run:
   ```sql
   ALTER USER postgres PASSWORD 'newpassword';
   ```

4. Exit and restart PostgreSQL:
   ```
   net start postgresql-x64-17
   ```

## Method 3: Edit pg_hba.conf
1. Find pg_hba.conf file (usually in PostgreSQL data directory)
2. Temporarily change authentication method to "trust"
3. Restart PostgreSQL
4. Connect and change password
5. Change authentication back to "md5"

## Quick Test
Try connecting with these common passwords:
- 1234
- postgres
- admin
- password
- root
