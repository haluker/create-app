module.exports = {

    /**
     * Providers that the application will register for use
     */
    providers: [
        "$Haluka/EncryptionServiceProvider",
        "$Haluka/ValidationServiceProvider",
        "haluka-mongoose",
        "haluka-passport",
        "haluka-mail",
    ],

    /**
     * Aliases for Providers
     */
    aliases: {
        "Database": "Haluka/Provider/Mongoose",
        "ModelBinding": "Haluka/Provider/Mongoose/ModelBinding",
        "Auth": "Haluka/Provider/Passport/Local",
        "Mail": "Haluka/Provider/Mail",
    },

    /**
     * Middlewares that are registered globally for all the routes.
     */
    globalMiddlewares: [
    ],

    /**
     * Middleware(s) with names which can be registered as per routes in group.
     */
    namedMiddlewares: {}
    
}
