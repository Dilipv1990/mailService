let express = require('express')
let router = express.Router()
let logger = require('../logger')
let http = require('https')
let properties = require('../env.json')
let R = require('ramda')
let Mailgun = require('mailgun-js')

const SERVICE_LIMIT = 2
let TRY_COUNT = 1
let FIRST = "MAIL_GUN"

router.use('/*', function (req, res, next) {
	res.header('access-control-allow-headers', 'Origin, X-Requested-With, Content-Type, Accept')
	res.header('access-control-allow-methods', 'GET, POST, PUT')
	res.header('access-control-allow-origin', '*')
	next()
})


let sendGridSend = function (request, response, resolve, reject) {
	logger.log("debug", "SENDGRID")
	let options = {
		"method": "POST",
		"hostname": "api.sendgrid.com",
		"port": null,
		"path": "/v3/mail/send",
		"headers": {
			"authorization": `Bearer ${properties.SENDGRID_API_KEY}`,
			"content-type": "application/json"
		}
	}

	let req = http.request(options, function (res) {
		let chunks = []

		res.on("data", function (chunk) {
			chunks.push(chunk)
		});

		res.on("end", function (data) {
			let body = Buffer.concat(chunks)
			logger.log("debug", body.toString())
			switch (res.statusCode) {
				case 200:
				case 250:
				case 202: resolve("success")
					break
				default:
					return reject("error")
			}
		})
	})

	req.write(JSON.stringify({
		personalizations:
			[{
				to: [...request.body.to],
				cc: request.body.cc && request.body.cc.length ? [...request.body.cc] : undefined,
				bcc: request.body.bcc && request.body.bcc.length ? [...request.body.bcc] : undefined,
			}],
		from: { email: request.body.from.email, name: request.body.from.name },
		subject: request.body.subject,
		content:
			[{
				type: 'text/plain',
				value: request.body.content
			}]
	}))
	req.end()
}

// let mailGunSend = function (request, response) {
// 	let options = {
// 		"method": "POST",
// 		"hostname": "api.mailgun.net",
// 		"path": properties.MAILGUN_PATH + properties.MAILGUN_DOMAIN,
// 		"post": null,
// 		"headers": {
// 			"authorization": `Basic api:${properties.MAILGUN_API}`,
// 			"content-type": "x-www-formurlencoded"
// 		}
// 	}

// 	let req = http.request(options, function (res) {
// 		let chunks = []

// 		res.on("data", function (chunk) {
// 			chunks.push(chunk)
// 		})

// 		res.on("end", function (data) {
// 			let body = Buffer.concat(chunks)
// 			logger.log("error", body.toString())
// 			logger.log("debug", res)
// 			switch (res.statusCode) {
// 				case 200:
// 				case 202: response.send({
// 					status: "success",
// 				})
// 					break
// 				default:
// 					response.send({
// 						status: "error"
// 					})
// 			}
// 		})
// 	})
// 	let to = R.reduce((a, b) => { return  a ? (a + "," + b.email) : b.email }, "", request.body.to)
// 	let cc = R.reduce((a, b) => { return a ? (a + "," + b.email) : b.email }, "", request.body.cc)
// 	let bcc = R.reduce((a, b) => { return a ? (a + "," + b.email) : b.email }, "", request.body.bcc)
// 	req.write(`
// 	from:${request.body.from.email}
// 	to:${to}
// 	cc:${cc}
// 	bcc:${bcc}	
// 	subject:${request.body.subject}
// 	text:${request.body.content}`)

// 	logger.log("debug", `
// 	from:${request.body.from.email}
// 	to:${to}
// 	cc:${cc}
// 	bcc:${bcc}	
// 	subject:${request.body.subject}
// 	text:${request.body.content}`)

// }

let mailGunSend = function (request, response, resolve, reject) {
	logger.log("debug", "mailgun")
	let mailgun = new Mailgun({ apiKey: properties.MAILGUN_API, domain: properties.MAILGUN_DOMAIN })
	let data = {
		from: request.body.from.email,
		to: R.reduce((a, b) => { return a ? (a + "," + b.email) : b.email }, "", request.body.to),
		subject: request.body.subject,
		html: request.body.content
	}
	if (request.body.cc && request.body.cc.length)
		data.cc = R.reduce((a, b) => { return a ? (a + "," + b.email) : b.email }, "", request.body.cc)
	if (request.body.bcc && request.body.bcc.length)
		data.bcc = R.reduce((a, b) => { return a ? (a + "," + b.email) : b.email }, "", request.body.bcc)
	logger.log("debug", data.cc)

	mailgun.messages().send(data, function (err, body) {
		if (err) logger.log("error", body, err, "mailgun")
		err ? reject("error") : resolve("success")
	});

}
router.route('/send').post((request, response) => {
	let res

	if (FIRST === "SEND_GRID") {
		new Promise((resolve, reject) => sendGridSend(request, response, resolve, reject)).catch(_ => {
			FIRST = "MAIL_GUN"
			new Promise((resolve, reject) => mailGunSend(request, response, resolve, reject))
		}).then(_ => successsresp(response)).catch(_ => errorresp(response))
	}
	else if (FIRST === "MAIL_GUN") {
		new Promise((resolve, reject) => mailGunSend(request, response, resolve, reject)).catch(_ => {
			FIRST = "SEND_GRID"
			new Promise((resolve, reject) => sendGridSend(request, response, resolve, reject))
		}).then(_ => successsresp(response)).catch(_ => errorresp(response))
	}
})
let successsresp = res => res.send({ status: "success" })
let errorresp = res => res.send({ status: "error" })

module.exports = router