setup instruction:(execute the following on git bash in the project root)

npm init -y

npm install

echo -e "
    PORT=>port<
    MONGO_URI=mongodb://localhost:27017/hotel_booking
    JWT_SECRET=>jwt_secret<
    JWT_EXPIRES_IN=1h
    ADMIN_PASSWORD=>adminpassword<
    ADMIN_EMAIL= >adminEmail<

    MAIL_HOST=>smtp.host.com<
    MAIL_PORT=>mailing port<
    MAIL_USER=>mail user<
    MAIL_PASS=>mail password<
    MAIL_FROM=>mail from< 
" > .env


----------------------------------------------------------------------------------------------


!! NOTE: OptAuth is a middle for allowing unauthenticated users (guests) to access certain endpoints i.e: a guest looking for a hotel, a guest accessing the homepage etc.. !!


progress:

-user role: 
            owner, client, admin 
            (unauthenticated/unregistered users = guest)

-owner 
            -registration requires admin validation to be usable
            -on validation, an email is recieved to notify user
            -has crud functionalities for hotels and rooms
-admin: 
            -cant be from public registration => is instead created manually 
            -can view all users
            -validate an owner using id
            -disable a user's acc using id (toggles the active status)
            -can delete a user

- client/guest:
            - can search hotels by different criteria (location & rating)





