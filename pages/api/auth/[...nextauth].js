import NextAuth from 'next-auth';
import Providers from 'next-auth/providers';
import jwt from 'jsonwebtoken';
import { fetchMyQuery } from '../../../util/fetchGraphQL';
import { addNewUser } from '../../../util/insertNewUser';

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export default NextAuth({
  // https://next-auth.js.org/configuration/providers
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Providers.Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  ],
  // Database optional. MySQL, Maria DB, Postgres and MongoDB are supported.
  // https://next-auth.js.org/configuration/databases
  //
  // Notes:
  // * You must to install an appropriate node_module for your database
  // * The Email provider requires a database (OAuth providers do not)
  // database: process.env.DATABASE_URL,

  // The secret should be set to a reasonably long random string.
  // It is used to sign cookies and to sign and encrypt JSON Web Tokens, unless
  // a separate secret is defined explicitly for encrypting the JWT.
  secret: process.env.SECRET,

  session: {
    // Use JSON Web Tokens for session instead of database sessions.
    // This option can be used with or without a database for users/accounts.
    // Note: `jwt` is automatically set to `true` if no database is specified.
    jwt: true,

    // Seconds - How long until an idle session expires and is no longer valid.
    // maxAge: 30 * 24 * 60 * 60, // 30 days

    // Seconds - Throttle how frequently to write to database to extend a session.
    // Use it to limit write operations. Set to 0 to always update the database.
    // Note: This option is ignored if using JSON Web Tokens
    // updateAge: 24 * 60 * 60, // 24 hours
  },

  // JSON Web tokens are only used for sessions if the `jwt: true` session
  // option is set - or by default if no database is specified.
  // https://next-auth.js.org/configuration/options#jwt
  jwt: {
    // A secret to use for key generation (you should set this explicitly)
    secret: process.env.SECRET,
    // Set to true to use encryption (default: false)
    // encryption: true,
    // You can define your own encode/decode functions for signing and encryption
    // if you want to override the default behaviour.
    // Hasura JWT claim
    encode: async ({ secret, token, maxAge }) => {
      const jwtClaims = {
        sub: token.sub,
        name: token.name,
        email: token.email,
        picture: token.picture,
        iat: Date.now() / 1000,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': ['user'],
          'x-hasura-default-role': 'user',
          'x-hasura-role': 'user',
          'x-hasura-user-id': token.sub,
        },
      };

      // console.log({ jwtClaims });

      const encodedToken = jwt.sign(jwtClaims, secret, { algorithm: 'HS256' });
      // console.log({ encodedToken });
      return encodedToken;
    },
    decode: async ({ secret, token, maxAge }) => {
      const decodedToken = jwt.verify(token, secret, { algorithms: ['HS256'] });
      return decodedToken;
    },
  },

  // You can define custom pages to override the built-in pages.
  // The routes shown here are the default URLs that will be used when a custom
  // pages is not specified for that route.
  // https://next-auth.js.org/configuration/pages
  pages: {
    // signIn: '/api/auth/signin',  // Displays signin buttons
    // signOut: '/api/auth/signout', // Displays form with sign out button
    // error: '/api/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/api/auth/verify-request', // Used for check email page
    // newUser: null // If set, new users will be directed here on first sign in
  },

  // Callbacks are asynchronous functions you can use to control what happens
  // when an action is performed.
  // https://next-auth.js.org/configuration/callbacks
  callbacks: {
    // async signIn(user, account, profile) { return true },
    // async redirect(url, baseUrl) { return baseUrl },
    async session(session, token) {
      const encodedToken = jwt.sign(token, process.env.SECRET, {
        algorithm: 'HS256',
      });
      session.id = token.sub;
      session.token = encodedToken;
      return Promise.resolve(session);
    },
    async jwt(token, user, account, profile, isNewUser) {
      const isUserSignedIn = user ? true : false;

      // Fetch user from Hasura API
      const { errors, data } = await fetchMyQuery(token.sub);
      if (errors) {
        console.log({ errors });
      }

      // Create user if not already in db
      if (!data?.users_by_pk) {
        // Do a mutatoin to store user data
        const { errors, data } = await addNewUser(token.sub, token.name);
        if (errors) {
          console.log(errors);
        }
      }

      if (isUserSignedIn) {
        token.id = user.id;
      }
      return Promise.resolve(token);
    },
  },

  // Events are useful for logging
  // https://next-auth.js.org/configuration/events
  events: {},

  // Enable debug messages in the console if you are having problems
  debug: true,
});

// mutation MyMutation {
//   insert_users_one(object: {id: "22605062", name: "Scott Tang", created_at: "22:18:06.814923"}, on_conflict: {constraint: users_pkey, update_columns: created_at}) {
//     id
//     name
//     created_at
//   }
// }
