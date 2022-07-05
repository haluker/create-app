module.exports = {

    timeout: 10000,

    trustProxy: true,

    gzip: true,
    
    post: {
        limit: '1mb'
    },

    upload: {
        multi: true,
        limit: '5mb'
    },

    helmet: {
        contentSecurityPolicy: false
    },

    sessionSecret : env('APP_KEY')


}