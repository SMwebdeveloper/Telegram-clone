const BaseError = require('../errors/base.error')
const jwt = require('jsonwebtoken')
const userModels = require('../models/user.models')
module.exports = async function (req, res, next) {
    try {
        const authorization = req.headers.authorization

        if (!authorization) {
            return next(BaseError.Unauthorized())
        }
        const token = authorization.split(" ")[1]

        if (!token) {
            return next(BaseError.Unauthorized())
        }

        const { userId } = jwt.verify(token, process.env.JWT_SECRET)

        if (!userId) {
            return next(BaseError.Unauthorized())
        }

        const user = await userModels.findById(userId)
        if (!user) {
            return BaseError.Unauthorized()
        }
        req.user = user
        next()
    } catch (error) {
        next(error)
    }
}