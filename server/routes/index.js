const authController = require('../controllers/auth.controller')
const userController = require('../controllers/user.controller')

const router = require('express').Router()

require('express-group-routes')

router.group('/auth', route => {
    route.post('/login', authController.login)
    route.post('/verify', authController.verify)
})

router.group('/user', route => {
    route.get('/messages/:contactId', userController.getMessages)
    route.get('/contacts', userController.getContact)

    route.post('/message', userController.createMessage)
    route.post('/contact', userController.createContact)
})

module.exports = router