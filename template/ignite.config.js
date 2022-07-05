module.exports = {
    prettyBoot: true,  // clears the console before starting application
    bootMessage: true,  // Boots up with pretty Haluka start console message
    useRecommended: true,  // uses recommended express middlewares (body-parser, helmet, gzip compression, trust proxy, public static path, busboy parser)
    httpConfig: 'haluka:config',
}