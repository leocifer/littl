const express = require('express')
const yup = require('yup')
const router = express.Router()
const monk = require('monk')
const path = require('path')
const rateLimit = require('express-rate-limit')
const slowDown = require('express-slow-down')
const { nanoid } = require('nanoid')

require('dotenv').config()

const notFoundPath = path.join(__dirname, '../public/404.html')

const db = monk(process.env.MONGODB_URI)
const littl = db.get('littl')
littl.createIndex({ slug: 1 }, { unique: true })

const schema = yup.object().shape({
	slug: yup
		.string()
		.trim()
		.matches(/^[\w\-]+$/i),
	url: yup.string().trim().url().required(),
})

router.get('/:id', async (req, res, next) => {
	const { id: slug } = req.params
	try {
		const url = await littl.findOne({ slug })
		if (url) {
			return res.redirect(url.url)
		}
		return res.status(404).sendFile(notFoundPath)
	} catch (error) {
		return res.status(404).sendFile(notFoundPath)
	}
})

router.post(
	'/url',
	// slowDown({
	// 	windowMs: 30 * 1000,
	// 	delayAfter: 1,
	// 	delayMs: 500,
	// }),
	// rateLimit({
	// 	windowMs: 30 * 1000,
	// 	max: 1,
	// }),
	async (req, res, next) => {
		let { slug, url } = req.body
		console.log({ slug, url })
		try {
			await schema.validate({
				slug,
				url,
			})

			if (!slug) {
				slug = nanoid(5)
			} else {
				const existing = await littl.findOne({ slug })
				if (existing) {
					throw new Error('Slug in use. 🍔')
				}
			}
			slug = slug.toLowerCase()
			const newUrl = {
				url,
				slug,
			}
			const created = await littl.insert(newUrl)
			res.json(created)
		} catch (error) {
			next(error)
		}
	}
)

module.exports = router
