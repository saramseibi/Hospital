const express = require('express');
const notifier = require('node-notifier');
const nodemailer = require('nodemailer');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const {Web3} = require('web3');
const mysql = require('mysql');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const {create} = require('ipfs-http-client');
const fs = require('fs').promises;
const multer = require('multer');

// Connexion à la base de données MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pfe'
});

connection.connect((error) => {
  if (error) {
    console.error('Error connecting to database:', error);
    return;
  }
  console.log('Connected to database');
});
const app = express();
const port = 3000;
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(session({
    secret: 'pfe',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

const mnemonic = 'setup amazing chalk scene castle knock deliver record one when brush upon';
const infuraUrl = 'https://sepolia.infura.io/v3/b2b1ddd3656a46e5a80d311155018d4e';

const provider = new HDWalletProvider({
  mnemonic: {
    phrase: mnemonic
  },
  providerOrUrl: infuraUrl,
});

const web3 = new Web3(provider);
const  ipfsClient  = create({host:'127.0.0.1', port:'5001',protocol:'http'});
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
const contractAddress = '0x5DC657d3d10104A0aC3F3e2A3e487CAfc87A476A'; 
const contract = new web3.eth.Contract(abi, contractAddress);

app.post('/upload', upload.single('file'), async (req, res) => {
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

    console.log('Doctor ID from session:', req.session.doctorId); // Log the doctor ID from session

    console.log('IPFS Hash:', ipfsHash);
    if (!ipfsHash) {
      return res.status(500).json({ message: 'Error uploading file: IPFS hash is undefined' });
    }

    // Retrieve the doctor ID from the session
    const doctorId = req.session.doctorId;

    // Retrieve the file name from the request
    const fileName = req.body.fileName;

    // Set the gas limit and get the current gas price
    const gasLimit = 5500000; // Set the gas limit according to your requirements
    const gasPrice = await web3.eth.getGasPrice(); // Get the current gas price

    // Construct the transaction object
    const txObject = {
      from: '0x1d7E2e9CFfea8BfE3F25861cB5E9dCD01080a267', 
      to: '0x5DC657d3d10104A0aC3F3e2A3e487CAfc87A476A', 
      gas: gasLimit, // Set the gas limit here
      gasPrice: gasPrice, // Set the gas price here
      data: contract.methods.upload(fileName, ipfsHash, doctorId).encodeABI()
    };

    // Sign the transaction
    const privateKey = '0xa9dbe448195b8a4a6fafd629f054abe7d828df0ca22d20ab96f8284af73ffa52';
    const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);

    // Send the signed transaction
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log('Transaction receipt:', receipt);

    res.redirect('/dossier');
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});
// Route pour récupérer les documents d'un médecin spécifique à partir de la blockchain
app.get('/documents', async (req, res) => {
  try {
    // Vérifier si l'ID du médecin est présent dans la session et s'il est valide
    const doctorId = req.session.doctorId;
    if (!doctorId || doctorId <= 0) {
      return res.status(400).json({ message: 'Invalid doctor ID' });
    }

    // Appeler la fonction de vue du contrat pour récupérer les documents du médecin spécifique
    const contractResponse = await contract.methods.getDoctorDocuments(doctorId).call();

    // Vérifier si des documents ont été renvoyés
    if (!contractResponse || contractResponse.length === 0) {
      return res.status(404).json({ message: 'No documents found for the doctor' });
    }

    // Mapper les données renvoyées par le contrat pour les documents
    const documents = contractResponse.map(doc => ({
      fileName: doc.fileName,
      ipfsHash: doc.ipfsHash
    }));

    // Renvoyer les documents en réponse à la requête HTTP
    res.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    // Gérer les erreurs spécifiques et renvoyer des messages d'erreur descriptifs
    if (error.code === 4001) {
      return res.status(401).json({ message: 'Unauthorized access: Please log in' });
    } else {
      return res.status(500).json({ message: 'Error fetching documents from blockchain' });
    }
  }
});






//Route pour la page principale
app.get('/', (req, res) => {
  res.render('accueil');
});

// Route pour la page de connexion patient
app.get('/logP', (req, res) => {
  res.render('loginPatient');
});
app.get('/upload', (req, res) => {
  res.render('upload');
});

// Route pour la page de connexion docteur
app.get('/log', (req, res) => {
  res.render('loginDoctor');
});
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
      if(err) {
          return res.redirect('/PatientList');
      }

      res.clearCookie('sid');
      return res.redirect('/log');
  });
});
// Route pour récupérer les détails d'un patient par son ID
app.get('/patient/:id', (req, res) => {
  const patientId = req.params.id;
  // Effectuer une requête à la base de données pour obtenir les détails du patient par son ID
  Patient.findById(patientId, (err, patient) => {
      if (err) {
          console.error('Erreur lors de la récupération des détails du patient :', err);
          return res.status(500).send('Erreur serveur lors de la récupération des détails du patient');
      }
      if (!patient) {
          return res.status(404).send('Patient non trouvé');
      }
      // Renvoyer les détails du patient en tant que réponse
      res.json(patient);
  });
});

app.get('/PatientList', async (req, res) => {
    // Rendre la page de la liste des patients avec les patients récupérés
    res.render('patientList');
});

app.get('/dossier', (req, res) => {
res.render('dossier');
});

app.get('/verify-user', (req, res) => {
  res.render('forgetPassword');
});
// Route pour afficher le formulaire de récupération de mot de passe
app.get('/forgetPassword', (req, res) => {
  res.render('forgetP');
});
app.get('/profile', (req, res) => {
  const email = req.session.email; // Get email from session
  if (!email) {
      return res.status(401).send('Unauthorized'); // Redirect to login page or handle unauthorized access
  }

  // Perform a database query to find the doctor by email
  const query = 'SELECT * FROM doctor WHERE email = ?';
  connection.query(query, [email], (err, results) => {
      if (err) {
          console.error('Error fetching doctor data:', err);
          res.status(500).send('Error fetching doctor data');
          return;
      }
      if (results.length === 0) {
          res.status(404).send('Doctor not found');
          return;
      }
      const doctor = results[0];
      res.render('Profile', { doctor });
  });
});

// Route pour afficher le formulaire de changement de mot de passe pour les patients
app.get('/resetP', (req, res) => {
const token = req.query.token;
res.render('resetP', { token: token });
});

// Route pour afficher le formulaire de changement de mot de passe pour les docteurs
app.get('/reset', (req, res) => {
const token = req.query.token;
res.render('reset', { token: token });
});
// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'outlook',
  auth: {
    user: 'pfe.isimg@outlook.fr',
    pass: 'pfeisimg123'
  }
});
// Route pour gérer la demande de réinitialisation de mot de passe pour les patients
app.post('/forgetPassword', (req, res) => {
  const { email } = req.body;

  // Generate a reset token
  const resetToken = generateResetToken();

  // Update the patient's record in the database with the reset token
  const query = 'UPDATE patient SET reset_token = ? WHERE email = ?';
  connection.query(query, [resetToken, email], (error, results) => {
    if (error) {
      console.error('Error updating reset token:', error);
      return res.status(500).send('Internal server error');
    }

    // Send the password reset email
    sendResetEmail(email, resetToken);
    showMessage('Password reset email has been sent', res);
  });
});

// Route pour gérer la demande de réinitialisation de mot de passe pour les docteurs
app.post('/verify-user', (req, res) => {
  const { email } = req.body;

  // Generate a reset token
  const resetToken = generateResetToken();

  // Update the doctor's record in the database with the reset token
  const query = 'UPDATE doctor SET reset_token = ? WHERE email = ?';
  connection.query(query, [resetToken, email], (error, results) => {
    if (error) {
      console.error('Error updating reset token:', error);
      return res.status(500).send('Internal server error');
    }

    // Send the password reset email
    sendResetEmail(email, resetToken);
    showMessage('Password reset email has been sent', res);
  });
});



// Route pour gérer la réinitialisation de mot de passe pour les patients via le lien
app.post('/resetP', (req, res) => {
  const { token, password } = req.body;

  // Update the patient's password in the database
  const query = 'UPDATE patient SET password = ?, reset_token = NULL WHERE reset_token = ?';
  connection.query(query, [password, token], (error, results) => {
    if (error) {
      console.error('Error resetting password:', error);
      return res.status(500).send('Internal server error');
    }
    if (results.affectedRows === 0) {
      console.error('Invalid reset token or user not found');
      return res.status(400).send('Invalid reset token or user not found');
    }
    showMessage('Password updated successfully');
  });
});

// Route pour gérer la réinitialisation de mot de passe pour les docteurs via le lien
app.post('/reset', (req, res) => {
  const { token, password } = req.body;

  // Update the doctor's password in the database
  const query = 'UPDATE doctor SET password = ?, reset_token = NULL WHERE reset_token = ?';
  connection.query(query, [password, token], (error, results) => {
    if (error) {
      console.error('Error resetting password:', error);
      return res.status(500).send('Internal server error');
    }
    if (results.affectedRows === 0) {
      console.error('Invalid reset token or user not found');
      return res.status(400).send('Invalid reset token or user not found');
    }
    res.send('Password updated successfully');
  });
});

app.post('/deletePatient', (req, res) => {
    const patientName = req.body.patientName; // Récupérer le nom du patient à supprimer depuis le corps de la requête

    // Requête SQL pour supprimer le patient de la table medical_records en fonction de son nom
    const sql = `DELETE FROM medical_records WHERE patient_name = ?`;

    // Exécution de la requête SQL avec le nom du patient à supprimer comme paramètre
    connection.query(sql, [patientName], (err, result) => {
        if (err) {
            console.error('Erreur lors de la suppression du patient :', err);
            res.status(500).send('Erreur lors de la suppression du patient');
            return;
        }
        console.log('Patient supprimé avec succès');
        res.send('Patient supprimé avec succès');
    });
});

app.post('/AddPatient', (req, res) => {
  const { patient_name, age,phone, diagnosis, treatment } = req.body;
  const doctor_id = req.session.doctorId; // Récupérer l'ID du médecin à partir de la session

  // Requête SQL pour insérer les données dans la table medical_records
  const sql = `INSERT INTO medical_records (id_doctor, patient_name, age,phone, diagnosis, treatment) 
               VALUES (?, ?, ?,?, ?, ?)`;

  // Paramètres pour la requête préparée
  const values = [doctor_id, patient_name, age,phone, diagnosis, treatment];

  // Exécution de la requête SQL
  connection.query(sql, values, (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'insertion des données :', err);
          res.status(500).send('Erreur lors de l\'insertion des données');
          return;
      }
      
      res.redirect('/PatientList');
  });
});
app.get('/patients', (req, res) => {
  const doctor_id = req.session.doctorId; // Récupérer l'ID du médecin à partir de la session

  // Requête SQL pour sélectionner les patients du médecin spécifique
  const sql = `SELECT * FROM medical_records WHERE id_doctor = ?`;

  // Exécution de la requête SQL avec l'ID du médecin comme paramètre
  connection.query(sql, [doctor_id], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des patients:', err);
          res.status(500).send('Erreur lors de la récupération des patients');
          return;
      }
      // Envoi des résultats au client
      res.json(results);
  });
});

// Route pour gérer l'inscription d'un patient
app.post('/signupP', (req, res) => {
  const { name, email, tlfn, cin, psw, gender, birth } = req.body;

  // Insert new patient into the database
  const query = `INSERT INTO patient (name, email, phone, cin, password, gender, birth, reset_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
  connection.query(query, [name, email, tlfn, cin, psw, gender, birth, null], (error, results) => {
    if (error) {
      console.error('Error signing up:', error);
      return res.status(500).send('Internal server error');
    }
    showMessage('User signed up successfully', res);
    res.redirect('/');
  });
});

// Route pour gérer l'inscription d'un docteur
app.post('/signup', (req, res) => {
  const { name, email, tlfn, cin, psw, code, gender, birth } = req.body;


  // Insérer le nouveau médecin dans la base de données avec son adresse Ethereum
  const query = `INSERT INTO doctor (name, email, phone, cin, password, code, gender, birth, reset_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?,  NULL, NOW(), NOW())`;
  connection.query(query, [name, email, tlfn, cin, psw, code, gender, birth], (error, results) => {
    if (error) {
      console.error('Error signing up doctor:', error);
      return res.status(500).send('Internal server error');
    }
    showMessage('Doctor signed up successfully', res);
    res.redirect('/log');
  });
});


// Route pour gérer l'authentification d'un patient
app.post('/signinP', (req, res) => {
  const { email, psw } = req.body;
  const query = `SELECT * FROM patient WHERE email = ? AND password = ?`;
  connection.query(query, [email, psw], (error, results) => {
    if (error) {
      console.error('Error signing in patient:', error);
      return res.status(500).send('Internal server error');
    }
    if (results.length > 0) {
      res.redirect('/');
    } else {
      showMessage('Incorrect email or password', res);
    }
  });
});
// Route pour gérer la connexion d'un docteur
app.post('/signin', (req, res) => {
  const { email, psw } = req.body;
  const query = `SELECT id FROM doctor WHERE email = ? AND password = ?`;
  connection.query(query, [email, psw], (error, results) => {
      if (error) {
          console.error('Error signing in doctor:', error);
          return res.status(500).send('Internal server error');
      }
      if (results.length > 0) {
          const doctorId = results[0].id;
          if (req.session) {
              req.session.doctorId = doctorId;
              req.session.email = email;
              // Affichage de l'ID du docteur après la connexion
              console.log('Doctor ID:', doctorId);
              res.redirect('/PatientList');
          } else {
              console.error('Error: req.session is not defined');
              return res.status(500).send('Internal server error');
          }
      } else {
          showMessage('Incorrect email or password', res);
      }
    
  });
});


function showMessage(message, res) {
  notifier.notify({
    title: 'Notification',
    message: message
  });
}

// Function to generate a random reset token
function generateResetToken() {
  return Math.random().toString(36).substr(2, 10);
}

// Function to send the password reset email
function sendResetEmail(email, token) {
  const mailOptions = {
    from: 'pfe.isimg',
    to: email,
    subject: 'Password Reset',
    html: `<p>To reset your password, <a href="http://localhost:3000/resetP?token=${token}">click here</a>.</p>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
