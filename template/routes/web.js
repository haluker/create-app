let Route = exports.Route = use('Router')

/**
 * @name WebRoutes
 * @desc Houses the routes for the application
 */

Route.get('/', function ({ res }) {
    res.send('Hello, World!')
})