const express = require('express');
const bodyParser = require('body-parser');
const es6Renderer = require('express-es6-template-engine')
const bcrypt = require('bcrypt')
const db = require('./models');
const cookieParser = require('cookie-parser');
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const store = new SequelizeStore({ db: db.sequelize })


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    store: store,
  }));
 store.sync();

app.use((req,res, next)=>{
  console.log('*****user*****')
  console.log(req.session.user)
  console.log('*****user*****')
  next();
})







app.use(express.static('./public'));

app.engine('html', es6Renderer);
app.set('views', 'templates')
app.set('view engine', 'html')

function checkAuth(req, res, next){
  if(req.session.user){
    next();
  } else{
    res.redirect('/login')
  }
}

app.get('/', checkAuth,(req, res)=>{
  res.render('index', {
    locals:{
      user: req.session.user
    }
  })
})


app.get('/register', (req, res)=>{
  res.render('register',{
    locals: {
      error: null
    }
  })
})

app.post('/register', (req, res) => {
      if(!req.body.email || !req.body.password){
        res.render('/register', {
          locals: {
            error: 'Please submit all required fields'
          }
        })
        return
      }
      const { email, password } = req.body
      
      bcrypt.hash(password, 10, (err, hash)=>{
        db.User.create({
          email: email,
          password: hash
        }).then((user)=>{
          res.redirect('/login')
        })
})

})

app.get('/login',(req, res)=>{
  res.render('login',{
    locals: {
      error: null
    }
  })
})

app.post('/login', (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.render('login', {
      locals: {
        error: 'Please submit all required fields'
      }
    })
    return
  }

  db.User.findOne({
    where: {
      email: req.body.email
    }
  }).then((user)=>{
    if(!user){
      res.render('login',{
        locals: { error: 'no user with that email' }
      })
      return
    }

    bcrypt.compare(req.body.password, user.password,(err,matched)=>{
      if(matched){
        req.session.user = user;

        res.redirect('/')
      }
      else{
        res.render('login',{
          locals: { 
            error:
             'Wrong Password' 
            }
        })
      }
      return
    })
  })
})

app.get('/logout', (req,res)=>{
  req.session.user =null;
  res.redirect('/login')
})
app.use('/api*', checkAuth)
// GET /api/todos
app.get('/api/todos', (req, res) => {
  db.Todo.findAll({
    where: {
      UserId: req.session.user.id
    }
  })
    .then((todos)=>{
      res.json(todos)
  })
  .catch((err)=>{
    console.log(err)
    res.status(500).json({err: 'A Data Error Occurred'});
  })
});



// GET /api/todos/:id
app.get('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  db.Todo.findOne({
    where: {
      id: id,
      UserId: req.session.user.id
    }
  })
    .then(todo => {
      if (!todo) {
        res.status(404).json({ error: `Could not find Todo with id: ${id}` })
        return;
      }
      res.json(todo)
    })
});

// POST /api/todos
app.post('/api/todos',checkAuth, (req, res) => {
  if (!req.body || !req.body.name) {
    res.status(400).json({
      error: 'Provide todo text',
    });
    return;
  }
  db.Todo.create({
    name: req.body.name,
    UserId: req.session.user.id
  }).then((newTodo)=>{
    res.json(newTodo)
  }).catch((err)=>{
    console.log(err)
    res.status(500).json({err: 'Database error '})
  })

});

// PUT /api/todos/:id
app.put('/api/todos/:id', checkAuth,(req, res) => {
  if (!req.body || !req.body.name) {
    res.status(400).json({
      error: 'Provide todo text',
    });
    return;
  }
  const { id } = req.params;
  db.Todo.findOne({
    where: {
      id: id,
      UserId: req.session.user.id
    }
  })
    .then((todo)=>{
      if(!todo){
        res.status(404).json({err: `could not find id with ${id}`})
        return;
      }
      todo.name = req.body.name;
      todo.complete = req.body.complete === undefined ?  todo.complete: req.body.complete
      todo.save()
      res.json(todo)
    }).catch((err) => {
      console.log(err)
      res.status(500).json({ err: 'Database error ' })
    })
});

// DELETE /api/todos/:id

app.delete('/api/todos/:id', (req, res) => {
  const {id} = req.params
  db.Todo.destroy({
    where: {
      id: id,
      UserId: req.session.user.id
    }
  }).then((deleted)=>{
    if (deleted === 0){
      res.status(404).json({err: `could not find ${id}`})
      return
    }
    res.status(204).json()
  }).catch((err) => {
    console.log(err)
    res.status(500).json({ err: 'Database error ' })
  })
});

app.listen(3000, function () {
  console.log('Todo List API is now listening on port 3000...');
});
