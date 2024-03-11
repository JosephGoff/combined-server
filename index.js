import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import dotenv from 'dotenv';
import { db, db_reis, db_social } from "./connect.js"; 

// Store
import productRoutes from "./routes/products.js";
import Stripe from 'stripe';

// REIS
import propertiesRoutes from "./routes/properties.js";

// RPG
import axios from 'axios';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

// Inspire
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import messageRoutes from "./routes/messages.js";
import commentRoutes from "./routes/comments.js";
import likeRoutes from "./routes/likes.js";
import storyRoutes from "./routes/stories.js";
import relationshipRoutes from "./routes/relationships.js";
import AWS from 'aws-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'https://reactaiplayground.online', 'https://inspireconnect.online'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}
  next();
});

app.use(bodyParser.json({ limit: "50mb" }));
//app.use('/orders', bodyParser.json());
//app.use('/products', bodyParser.json());
//app.use('/properties', bodyParser.json());
//app.use('/upload-files', bodyParser.json());
//app.use('/github-proxy', bodyParser.json());
//app.use('/gpt-message-editor', bodyParser.json());
//app.use('/gpt-message', bodyParser.json());

app.use((req, res, next) => {
  if (req.headers.authorization) {
    req.accessToken = req.headers.authorization.split(' ')[1]
  }
  next()
})




// Store
const stripe = Stripe(process.env.STRIPE_TEST_KEY);

async function saveSession(sessionId, products) {
    try {
        console.log("Inserting Session Into DB")
        const productsJSON = JSON.stringify(products);

        const sql = "INSERT INTO sessions (session_id, session_object) VALUES (?, ?)";
        const values = [sessionId, productsJSON];

        const result = await new Promise((resolve, reject) => {
            db.query(sql, values, (err, result) => {
              if (err) {
                console.error("Error saving session:", err);
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
          console.log("Session saved successfully:", result.insertId);

      } catch (error) {
        console.error("Error saving session:", error);
    }
}

async function saveOrder(session) {
    try {
        console.log("Saving Order To DB -> First matching products")
        const getSessionQuery = "SELECT session_object FROM sessions WHERE session_id = ?";
        const sessionValues = [session.id];

        const sessionResult = await new Promise((resolve, reject) => {
            db.query(getSessionQuery, sessionValues, (err, result) => {
                if (err) {
                    console.error("Error querying session:", err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

        // Extract the products from the session object
        console.log("Match", sessionResult)
        const sessionObject = JSON.parse(sessionResult[0].session_object);

	const sql = "INSERT INTO orders (session_id, order_object, products_matched, fulfilled) VALUES (?, ?, ?, ?)";
        const values = [session.id, JSON.stringify(session), JSON.stringify(sessionObject), 0];

        const result = await new Promise((resolve, reject) => {
            db.query(sql, values, (err, result) => {
              if (err) {
                console.error("Error saving order:", err);
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
          console.log("Order saved successfully:", result.insertId);

      } catch (error) {
        console.error("Error saving order:", error);
    }
}

app.post('/orders', async (req, res) => {
  try {
    const { products } = req.body;

    const getProducts = () => {
      return new Promise((resolve, reject) => {
        const q = `SELECT * FROM products`;
        db.query(q, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    };

    const fetchProducts = async () => {
      try {
        const productsList = await getProducts();
        return productsList;
      } catch (error) {
        console.error(error);
        return [];
      }
    };

    const productsList = await fetchProducts();
    console.log(productsList)

    const lineItems = await Promise.all(
      products.map(async (product) => {
        const databaseProduct = productsList.find(p => p.id === product.id);

        if (!databaseProduct) {
          throw new Error(`Product with id ${product.id} not found in the database`);
        }

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: databaseProduct.name,
            },
            unit_amount: databaseProduct.price * 100
          },
          quantity: product.quantity,
        };
      })
    );
    console.log(lineItems)

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}?success=true`,
      cancel_url: `${process.env.CLIENT_URL}?success=false`,
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      payment_method_types: ["card"],
    });

    try {
        let session_id = session.id
        await saveSession( session_id, products );
    } catch (error) {
        console.error("Error saving session to database:", error);
    }

    res.json({ stripeSession: session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const endpointSecret = "whsec_613mJtqrnBpshVLw2ecVetxZtBOhFPbj"
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  console.log('Received webhook request - Successful Checkout');
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.sendStatus(400);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.completed':
        const session = event.data.object;
        try {
            await saveOrder(session);
        } catch (error) {
            console.error("Error saving order to database", error);
        }
        break;
    default:
        console.log('Unhandled event type:', event.type);
  }

  res.sendStatus(200);
});


app.use("/products", productRoutes);
app.get('/',(req,res)=> {
    res.json({products: 51})
  }
)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});





// REIS
app.use("/properties", propertiesRoutes);





// ReactAIPlayground
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB in bytes
  },
});

// Recieve Files
//const { exec } = require('child_process');
//const { promisify } = require('util');
const execAsync = promisify(exec);

app.post('/upload-files', upload.array('file'), async (req, res) => {
  console.log("UPLOAD FILES")
  await fs.emptyDir('uploads');
  console.log('Contents of the uploads folder deleted.');

  try {
    const uploadedFiles = req.files;
    const filenames = req.body.filenames;

    if (!Array.isArray(filenames) || uploadedFiles.length !== filenames.length) {
      throw new Error('Invalid request data.');
    }

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const filename = filenames[i];
      const filePath = path.join('uploads', filename);

      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      fs.writeFileSync(filePath, file.buffer);
    }

    console.log('Files saved to the server.');

    let reactAppDir = path.join('uploads', 'react-app');


    // const updateNpmCommand = `cd ${reactAppDir} && npm update -g npm`;
    const installCommand = `cd ${reactAppDir} && npm install --timeout=600000 --no-bin-links`;
    // const buildCommand = `cd ${reactAppDir} && npm run build`;
    const buildCommand = `cd ${reactAppDir} && npx react-scripts build`;

    exec(installCommand, async (buildError, buildStdout, buildStderr) => {
      if (buildError) {
        console.error('Error installing React app:', buildError);
        res.status(500).send('Error installing React app.');
        return;
      }

      console.log("Installation successful")

      exec(buildCommand, async (buildError, buildStdout, buildStderr) => {
        if (buildError) {
          console.error('Error building React app:', buildError);
          res.status(500).send('Error building React app.');
          return;
        }

        console.log('React app built successfully.');

        // Deploy to Vercel using the Vercel CLI
        reactAppDir = path.join('uploads', 'react-app', 'build');

        const timestamp1 = new Date().toISOString().replace(/[-:.TZ]/g, "");
        const deploymentTitle = `react-ai-${timestamp1}`;
        console.log(deploymentTitle);

        const deployCommand = `vercel --prod ${reactAppDir} --token=${process.env.VERCEL_TOKEN} --confirm --debug --name=${deploymentTitle}`;
        const deploymentOptions = {};

        try {
          // Execute the deployment command
          console.log("Deploying...");
          await execAsync(deployCommand, deploymentOptions);
          console.log('React app deployed to Vercel.');

          // Delete uploads contents
          res.status(200).send(`https://${deploymentTitle}.vercel.app`);
          await fs.emptyDir('uploads');
          console.log('Contents of the uploads folder deleted.');
        } catch (deployError) {
          console.error('Error during deployment:', deployError);
          res.status(500).send('Error during deployment.');
          return;
        }
      });
    });


    // exec(`cd ${reactAppDir} && npm update -g npm && npm install --timeout=600000 npm run build > build.log 2>&1`, async (error, stdout, stderr) => {
    //   if (error) {
    //     console.error('Error building React app:', error);
    //     res.status(500).send('Error building React app.');
    //     return;
    //   }

    //   console.log('React app built successfully.');

    //   // Deploy to Vercel using the Vercel CLI
    //   reactAppDir = path.join('uploads', 'react-app', 'build');

    //   const timestamp1 = new Date().toISOString().replace(/[-:.TZ]/g, "");
    //   let timestamp = timestamp1
    //   const deploymentTitle = `react-ai-${timestamp}`;
    //   console.log(deploymentTitle)

    //   const deployCommand = `vercel --prod ${reactAppDir} --token=${process.env.VERCEL_TOKEN} --confirm --debug --name=${deploymentTitle}`;
    //   const deploymentOptions = {}

    //   try {
    //     // Execute the deployment command
    //     console.log("Deploying...")
    //     await execAsync(deployCommand, deploymentOptions);
    //     console.log('React app deployed to Vercel.');

    //     // Delete uploads contents
    //     res.status(200).send("https://" + deploymentTitle + ".vercel.app");
    //     await fs.emptyDir('uploads');
    //     console.log('Contents of the uploads folder deleted.');
    //   } catch (deployError) {
    //     console.error('Error during deployment:', deployError);
    //     res.status(500).send('Error during deployment.');
    //     return;
    //   }

    // });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).send('Error uploading files.');
  }
});


// Github Proxy
app.get('/github-proxy', async (req, res) => {
  console.log("GIT PROXY")
  try {
    const response = await axios.get(req.query.url, {
      responseType: 'arraybuffer',
    });

    res.setHeader('Content-Disposition', `attachment; filename=${response.headers['content-disposition']}`);
    res.setHeader('Content-Type', response.headers['content-type']);

    res.send(response.data);
  } catch (error) {
    console.error('Error proxying request:', error);
    res.status(500).send('Error');
  }
});

// Get Message
app.post('/gpt-message', async (req, res) => {
  console.log("GPT MESSAGE")
  const messages = req.body.messages
  const apiKey = process.env.OPENAI_API_KEY;
  async function getMessage(messages) {
    const formattedMessages = messages.map(message => ({
      role: message.isBot ? "assistant" : "user",
      content: message.text
    }))
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: formattedMessages,
      })
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', options);
    const data = await response.json();
    const message = data.choices[0].message;
    if (message.content) {
      return message.content;
    }
    else if (message.function_call) {
      try {
        const result = JSON.parse(message.function_call.arguments);
        return result.code
      } catch {
        return message.function_call.arguments;
      }
    }
    else {
      return "Appologies, server is down right now...";
    }
  }

  const result = await getMessage(messages)
  res.status(200).send(result);
});


app.post('/gpt-message-editor', async (req, res) => {
  console.log("GPT MESSAGE EDITOR")

  let messages = req.body.message
  let temp = req.body.temperature
  let gpt = req.body.gpt

  const apiKey = process.env.OPENAI_API_KEY;
  async function getMessage(messages) {
    const formattedMessages = messages.map(message => ({
      role: message.isBot ? "assistant" : "user",
      content: message.text
    }))
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: `gpt-${gpt}`,
        temperature: temp,
        messages: formattedMessages,

      })
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', options);
    const data = await response.json();
    const message = data.choices[0].message;
    if (message.content) {
      return message.content;
    }
    else if (message.function_call) {
      try {
        const result = JSON.parse(message.function_call.arguments);
        return result.code
      } catch {
        return message.function_call.arguments;
      }
    }
    else {
      return "Appologies, server is down right now...";
    }
  }

  const result = await getMessage(messages)
  res.status(200).send(result);
});








// Inspire Connect
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  console.log("Uploading to Database")
  try {
    const blobName = `inspire-connect/${Date.now()}-${req.file.originalname}`;
    const params = {
      Bucket: 'aws1-bucket1-jg',
      Key: blobName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    };

    await s3.upload(params).promise();

    const imageUrl = `https://aws1-bucket1-jg.s3.amazonaws.com/${blobName}`;
    // Store the imageUrl in your database or use it as needed

    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/posts", postRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/likes", likeRoutes)
app.use("/api/relationships", relationshipRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/stories", storyRoutes)

// For any route that is not recognized by the API, serve the React front-end
app.get('/api/*', (req, res) => {
  res.status(404).json("Page does not exist!");
});
