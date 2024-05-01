//require('dotenv').config(); 
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const express = require('express')
const path = require('path');
const { Web3 } = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs').promises;
const multer = require('multer');
const router = express.Router();
const { create } = require('ipfs-http-client');
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

/*async function hashPassword(password) {
    const saltRounds = 8; 
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log("Hashed Password:", hashedPassword);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
}

hashPassword('100');
console.log(hashPassword);*/
const signin = async (req, res, next) => {
    try {
        //console.log(req.body);
        const { Username, password, code } = req.body;

        let [userExists] = await db.promise().query('SELECT ID FROM doctor WHERE name = ?', [Username]);
        if (userExists.length === 0) {
            return res.render('doctorlogin', { message: 'No user found with that username' });
        }

        let [userResults] = await db.promise().query('SELECT ID,doctor_code, name,image, password  FROM doctor WHERE doctor_code ', [code]);
        if (userResults.length === 0) {
            return res.render('doctorlogin', { message: 'No doctor found with that code' });
        }

        const user = userResults[0];
        console.log('Session ', user);
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('doctorlogin', { message: 'Incorrect password' });
        } else {

            req.session.doctorname = user.name;
            req.session.doctorid = user.ID;
            req.session.doctorimage = user.image
            req.session.doctoremail = user.email;
            req.session.save();
            return res.redirect('/doctoraccount');
        }
    } catch (error) {
        console.log(error);
        next(error);
    }

};


// forget password 
const forget = async (req, res) => {
    const email = req.body.email;

    db.query('SELECT ID, email FROM doctor WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.render('doctorforgetpassword', { message: 'Error accessing database' });
        }

        if (results.length === 0) {
            return res.render('doctorforgetpassword', { message: 'Email does not exist' });
        }
        const user = results[0];
        const token = crypto.randomBytes(16).toString('hex');

        console.log(token);
        const updateQuery = 'UPDATE doctor SET token = ? WHERE ID = ?';


        try {
            db.query(updateQuery, [token, user.ID]);

            const transporter = nodemailer.createTransport({
                service: "Gmail",
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });


            const mailOptions = {
                to: user.email,
                subject: 'Password Reset Request',
                text: `Click the following link to reset your password: http://localhost:3007/doctorresetpassword/${token}`,
                html: `<p>Click the following link to reset your password:</p><p><a href="http://localhost:3007/doctorresetpassword/${token}">click here </a></p>`
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log(err);
                    return res.render('doctorforgetpassword', { message: 'Error sending email' });
                } else {
                    console.log(info);
                    return res.render('doctorforgetpassword', { message: 'Password reset email sent' });
                }
            });
        } catch (err) {
            console.error(err);
            return res.render('doctorforgetpassword', { message: 'Error generating token' });
        }
    });
};
//reset password 
const reset = async (req, res) => {
    const token = req.body.token;
    const password = req.body.password;
    const confirm_password = req.body.confirm_password;

    if (password !== confirm_password) {
        return res.render('doctorresetpassword.hbs', { token, message: 'Passwords do not match' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        const updateQuery = 'UPDATE doctor SET password = ? WHERE token = ?';

        // Executing the query once with error handling
        const [result] = await db.promise().query(updateQuery, [hashedPassword, token]);

        // Check if the update was successful
        if (result.affectedRows === 0) {
            throw new Error('No user found with the provided token or password update failed.');
        }

        console.log('Password updated successfully:', hashedPassword);
        return res.render('doctorlogin.hbs', { message: 'Password reset successful' });
    } catch (err) {
        console.error('Error updating password:', err);
        return res.render('doctorresetpassword.hbs', { token, message: 'Error updating password' });
    }
};
//search 
const search = (req, res) => {
    console.log('Query parameters:', req.query);
    const name = req.query.name || '';
    const doctorname = req.session.doctorname;
    const query = 'SELECT * FROM appointments WHERE LOWER(name) LIKE LOWER(?) AND doctor_name = ?';
    const values = [`%${name}%`, doctorname];

    //console.log('Executing query:', query);
    //console.log('With values:', values);
    db.query(query, values, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('An internal server error occurred');
        }
        const formattedResults = results.map(appointment => {
            const date = new Date(appointment.day);
            const dayFormatted = date.toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            });
            return {
                ...appointment,
                day: dayFormatted
            };
        });
        if (formattedResults.length > 0) {
            return res.render('doctoraccount.hbs', {
                appointments: formattedResults,
                doctorname: req.session.doctorname,
                doctorProfileImage: req.session.doctorimage
            });

        } else {
            return res.render('doctoraccount.hbs', { appointments: [], message: 'No search results found' });
        }
    });
};
 //multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        console.log(file);
        cb(null, file.originalname);

    }
});

const upload = multer({ storage: storage });
// edit profile
router.post('/doctoreditprofile', upload.single('fileToUpload'), async (req, res) => {
    const { name, password, cpassword } = req.body;
    const ID = req.session.doctorid;

    const file = req.file;
    console.log(req.file)

    if (password !== cpassword) {
        return res.render('doctoreditprofile', {
            message: "Passwords do not match."
        });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    try {
        const userProfileImagePath = path.join('/uploads', req.file.originalname);
        let filepath = file ? file.path : null;
        if (filepath) {
            await db.promise().query('UPDATE doctor SET name = ?, password = ?, image = ? WHERE ID = ?', [name, hashedPassword, userProfileImagePath, ID]);

        }

        const [results] = await db.promise().query('SELECT name, image FROM doctor WHERE ID = ?', [ID]);
        const { name: doctorname, image: doctorProfileImage } = results[0];


        return res.render('doctoreditprofile', {
            message: "Profile updated successfully!",
            doctorname: doctorname,
            doctorProfileImage: doctorProfileImage
        });

    } catch (err) {
        console.error(err);
        return res.render('doctoreditprofile', { message: "An error occurred" });
    }

});
// add document + blockhain 


// New configuration for blockchain document uploads
const blockchainStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './blockchainUpload');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
});

const blockchainUpload = multer({ storage: blockchainStorage });
const mnemonic = 'render must plunge suggest eight motion bitter agent square crater addict expect';
const infuraUrl = 'https://sepolia.infura.io/v3/b2b1ddd3656a46e5a80d311155018d4e';

const provider = new HDWalletProvider({
    mnemonic: {
        phrase: mnemonic
    },
    providerOrUrl: infuraUrl,
});

const web3 = new Web3(provider);
const ipfsClient = create({ host: '127.0.0.1', port: '5001', protocol: 'http' });
const abi =[
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "fileName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "ipfsHash",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "doctorId",
				"type": "uint256"
			}
		],
		"name": "upload",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "doctorId",
				"type": "uint256"
			}
		],
		"name": "getDoctorDocuments",
		"outputs": [
			{
				"components": [
					{
						"internalType": "string",
						"name": "fileName",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "ipfsHash",
						"type": "string"
					}
				],
				"internalType": "struct StockageHachages.Document[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "doctorId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "getDocumentDetails",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];
const contractAddress = '0x7D247aCa4EA133199634Fd1d5dA301E968251763';
const contract = new web3.eth.Contract(abi, contractAddress);


router.post('/upload', blockchainUpload.single('file'), async (req, res) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Read the uploaded file
        const fileData = await fs.readFile(req.file.path);
        console.log('File data:', fileData.toString()); // Log the file content

        // Add the file to IPFS
        const ipfsResult = await ipfsClient.add(fileData);
        console.log('IPFS Result:', ipfsResult); // Log the IPFS add result
        const ipfsHash = ipfsResult.cid.toString();

        // Delete the temporary file
        await fs.unlink(req.file.path);

        console.log('Doctor ID from session:', req.session.doctorid); // Log the doctor ID from session

        console.log('IPFS Hash:', ipfsHash);
        if (!ipfsHash) {
            return res.status(500).json({ message: 'Error uploading file: IPFS hash is undefined' });
        }

        // Retrieve the doctor ID from the session
        const doctorId = req.session.doctorid;

        // Retrieve the file name from the request
        const fileName = req.body.fileName;

        // Set the gas limit and get the current gas price
        const gasLimit = 5500000; // Set the gas limit according to your requirements
        const gasPrice = await web3.eth.getGasPrice(); // Get the current gas price

        // Construct the transaction object
        const txObject = {
            from: '0xcb0D87301033298553023673d60070Ee65FD1252',
            to: '0x7D247aCa4EA133199634Fd1d5dA301E968251763',
            gas: gasLimit, // Set the gas limit here
            gasPrice: gasPrice, // Set the gas price here
            data: contract.methods.upload(fileName, ipfsHash, doctorId).encodeABI()
        };

        // Sign the transaction
        const privateKey = '0e326c1665a619ef71900df6fecdff6dcb27437028e3c28ebcbed344a6dfbba4';
        const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);

        // Send the signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log('Transaction receipt:', receipt);

        res.redirect('/document');
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Error uploading file' });
    }
});
router.get('/documents', async (req, res) => {
    try {
        const doctorId = req.session.doctorid;
        console.log('Session Doctor ID:', doctorId);  // Debug: log session doctor ID

        if (!doctorId || doctorId <= 0) {
            return res.status(400).json({ message: 'Invalid doctor ID' });
        }

        console.log('Contract Address:', contract.options.address); // Ensure contract is loaded
        const contractResponse = await contract.methods.getDoctorDocuments(doctorId).call();
        console.log('Contract Response:', contractResponse);  // Log the response from the blockchain

        if (!contractResponse || contractResponse.length === 0) {
            return res.status(404).json({ message: 'No documents found for the doctor' });
        }

        const documents = contractResponse.map(doc => ({
            fileName: doc.fileName,
            ipfsHash: doc.ipfsHash
        }));

        res.json({ documents });
    } catch (error) {
        console.error('Error fetching documents:', error);
        return res.status(500).json({ message: `Error fetching documents from blockchain: ${error.message}` });
    }
});



module.exports = { signin, blockchainUpload,upload, forget, reset, search, router };
//module.exports = ipfs;
