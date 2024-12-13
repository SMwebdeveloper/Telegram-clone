const BaseError = require('../errors/base.error')
const { CONST } = require('../lib/constants')
const messageModels = require('../models/message.models')
const userModels = require('../models/user.models')
const mailService = require('../service/mail.service')

class UserController {
    // [GET]
    async getContact(req, res, next) {
        try {
            const userId = req.user._id
            // const user = await userModels.findById(userId)

            const contacts = await userModels.findById(userId).populate('contacts')
            const allContacts = contacts.contacts.map(contact => contact.toObject())
            for (const contact of allContacts) {
                const lastMessage = await messageModels
                    .findOne({
                        $or: [
                            { sender: userId, receiver: contact._id },
                            { sender: contact._id, receiver: userId },
                        ],
                    })
                    .populate({ path: 'sender' })
                    .populate({ path: 'receiver' })
                    .sort({ createdAt: -1 })

                contact.lastMessage = lastMessage
            }

            return res.status(200).json({ contacts: allContacts })
        } catch (error) {
            next(error)
        }
    }
    async getMessages(req, res, next) {
        try {
            const user = '675493543b7fbe3c33f1401e'
            const { contactId } = req.params

            const messages = await messageModels
                .find({
                    $or: [
                        { sender: user, receiver: contactId },
                        { sender: contactId, receiver: user },
                    ],
                })
                .populate({ path: 'sender', select: 'email' })
                .populate({ path: 'receiver', select: 'email' })

            await messageModels.updateMany({ sender: contactId, receiver: user, status: 'SENT' }, { status: CONST.READ })

            res.status(200).json({ messages })
        } catch (error) {
            next(error)
        }
    }

    // [POST]
    async createMessage(req, res, next) {
        try {
            const newMessage = await messageModel.create(req.body)
            const currentMessage = await messageModel
                .findById(newMessage._id)
                .populate({ path: 'sender', select: 'email' })
                .populate({ path: 'receiver', select: 'email' })
            res.status(201).json({ newMessage: currentMessage })
        } catch (error) {
            next(error)
        }
    }
    async messageRead(req, res, next) {
        try {
            const { messages } = req.body
            const allMessages = []

            for (const message of messages) {
                const updatedMessage = await messageModels.findByIdAndUpdate(message._id, { status: CONST.READ }, { new: true })
                allMessages.push(updatedMessage)
            }

            res.status(200).json({ messages: allMessages })
        } catch (error) {
            next(error)
        }
    }
    async createContact(req, res, next) {
        try {
            const { email } = req.body
            const userId = req.user._id
            const user = await userModels.findById(userId)
            const contact = await userModels.findOne({ email })
            if (!contact) throw BaseError.BadRequest('User with this email does not exist')

            if (user.email === contact.email) throw BaseError.BadRequest('You cannot add yourself as a contact')

            const existingContact = await userModels.findOne({ _id: userId, contacts: contact._id })
            if (existingContact) throw BaseError.BadRequest('Contact already exists')

            await userModels.findByIdAndUpdate(userId, { $push: { contacts: contact._id } })
            const addedContact = await userModels.findByIdAndUpdate(contact._id, { $push: { contacts: userId } }, { new: true })
            return res.status(201).json({ contact: addedContact })
        } catch (error) {
            next(error)
        }
    }
    async createReaction(req, res, next) {
        try {
            const { messageId, reaction } = req.body
            const updatedMessage = await messageModels.findByIdAndUpdate(messageId, { reaction }, { new: true })
            res.status(201).json({ updatedMessage })
        } catch (error) {
            next(error)
        }
    }
    async sendOtp(req, res, next) {
        try {
            const { email } = req.body
            const existingUser = await userModels.findOne({ email })
            if (existingUser) throw BaseError.BadRequest('User with this email already exists')
            await mailService.sendOtp(email)
            res.status(200).json({ email: email })
        } catch (error) {
            next(error)
        }
    }

    // [PUT]
    async updateProfile(req, res, next) {
        try {
            const user = req.user
            await userModels.findByIdAndUpdate(user._id, req.body)
            res.status(200).json({ message: 'Profile updated successfully' })
        } catch (error) {
            next(error)
        }
    }
    async updateMessage(req, res, next) {
        try {
            const { messageId } = req.params
            const { text } = req.body
            const updatedMessage = await messageModels.findByIdAndUpdate(messageId, { text }, { new: true })
            res.status(200).json({ updatedMessage })
        } catch (error) {
            next(error)
        }
    }
    async updateEmail(req, res, next) {
        try {
            const { email, otp } = req.body
            const result = await mailService.verifyOtp(email, otp)
            if (result) {
                const userId = req.user._id
                const user = await userModels.findByIdAndUpdate(userId, { email }, { new: true })
                res.status(200).json({ user })
            }
        } catch (error) {
            next(error)
        }
    }

    // [DELETE]
    async deleteUser(req, res, next) {
        try {
            const userId = req.user._id
            await userModels.findByIdAndDelete(userId)
            res.status(200).json({ message: 'User deleted successfully' })
        } catch (error) {
            next(error)
        }
    }
    async deleteMessage(req, res, next) {
        try {
            const { messageId } = req.params
            await messageModels.findByIdAndDelete(messageId)
            res.status(200).json({ message: 'Message deleted successfully' })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new UserController()