const BaseError = require('../errors/base.error')
const { CONST } = require('../lib/constants')
const messageModels = require('../models/message.models')
const userModels = require('../models/user.models')

class UserController {
    // [GET]
    async getContact(req, res, next) {
        try {
            const userId = '675493543b7fbe3c33f1401e'
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
            const newMessage = await messageModels.create(req.body)
            const currentMessage = await messageModels
                .findById(newMessage._id)
                .populate({ path: 'sender', select: 'email' })
                .populate({ path: 'receiver', select: 'email' })
            res.status(201).json({ newMessage: currentMessage })
        } catch (error) {
            next(error)
        }
    }
    async createContact(req, res, next) {
        try {
            const { email } = req.body
            const userId = '675493543b7fbe3c33f1401e'
            const user = await userModels.findById(userId)
            const contact = await userModels.findOne({ email })
            if (!contact) throw BaseError.BadRequest("User with this email does not exist")

            if (user.email === contact.email) throw BaseError.BadRequest("You cannot add yourself as a contact")

            const existingContact = await userModels.findOne({ _id: userId, contacts: contact._id })
            if (existingContact) throw new BaseError.BadRequest("Cannot already exists")

            await userModels.findByIdAndUpdate(userId, { $push: { contacts: contact._id } })
            const addContact = await userModels.findByIdAndUpdate(contact._id, { $push: { contacts: userId } }, { new: true })
            return res.status(201).json({ message: "Contact added successfully", contact: addContact })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new UserController()