// This is the main server file.


// Imports.
var express = require('express')
// var bodyParser = require('body-parser')
var app = express()

var http = require('http')
var server = http.Server(app)
var Flow = require('./modules/Flow.js')
var request = require('request');
var flow = new Flow()
var io = require('socket.io')(server)
var bodyParser = require('body-parser');
var multer  = require('multer');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Dependecies.
app.use("/external", express.static(__dirname + '/external'))
app.use("/modules", express.static(__dirname + '/modules'))
app.use("/data", express.static(__dirname + '/data'))
// app.use("/modules/frontend", express.static(__dirname + '/modules/frontend'))

var distance_f = function(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;    // Math.PI / 180
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 +
          c(lat1 * p) * c(lat2 * p) *
          (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

var client_id = 0
var last_change_client_id = 0
var connections = []
var client_ids = []
var locations = []
var details = []

io.on('connection', function(socket) {
  // New client.
  client_id += 1
  connections.push(socket)
  client_ids.push(client_id)
  console.log(client_ids)
  details[client_id] = new Object()

  // Send id.
  socket.emit("id", { id: client_id })

  socket.on("location", function(request) {
    locations[request.id] = request.data
    console.log(locations)
  })

  socket.on("form_update", function(request) {
    details[request.id] = request.data
    last_change_client_id = request.id
    console.log(details)
  })

  socket.on("last_id", function(request) {
    details[request.id] = details[last_change_client_id]
    locations[request.id] = locations[last_change_client_id]
    console.log(details)

    // A new offer.
    for(var i = 0; i < connections.length; i++) {
      var t_id = client_ids[i]
      var d = distance_f(locations[t_id].latitude, locations[t_id].longitute,
        locations[request.id].latitude, locations[request.id].longitude)
      if(!d || d < 0.2) d = 0.2
      console.log("Distance: " + d)
      if(request.id != t_id && details[t_id].live_for_food == true ) // && (d < 0.5 || d == undefined || d == NaN)
        connections[i].emit("new_offer", { details: details[request.id],
          location: locations[request.id], unique_id: request.id, estimate: (d / 0.2) })

    }

    // socket.emit("id", { id: last_change_client_id })
  })

  socket.on("accept_offer", function(request) {
    // Send notification and withdraw from others.
    for(var i = 0; i < connections.length; i++) {
      var t_id = client_ids[i]
      if(request.his_id == t_id) {
        connections[i].emit("someone_accepted", {
          details: details[request.id], location: locations[request.id],
          buyer_id: request.id
        })
      } else {
        connections[i].emit("withdraw_offer", {
          id: request.his_id
        })
      }

    }
  })

  socket.on("cancel_my_offer", function(request) {
    // Send notification and withdraw from others.
    for(var i = 0; i < connections.length; i++) {
      var t_id = client_ids[i]
      if(request.id != t_id) {
        connections[i].emit("withdraw_offer", {
          id: request.his_id
        })
      }
    }
  })





  // socket.on("msg", function(request) {
  //   for(var i = 0; i < connections.length; i++)
  //     if(request.id != client_ids[i])
  //       connections[i].emit("alert", request.data)
  // })

  socket.on('disconnect', function(data) {
    // Free memory.
    var index = connections.indexOf(socket)
    connections.splice(index, 1)
    client_ids.splice(index, 1)
    console.log(client_ids)
  })
})


// Redirect file requests.
app.get('/', function(req, res) {
  // console.log(JSON.stringify(req.query))
  console.log('connection')
  res.sendFile(__dirname + '/index.html')

})

app.get('/get', function(req, res) {
  // console.log(JSON.stringify(req.query))
  console.log('connection')
  res.sendFile(__dirname + '/get.html')

})

app.get('/settings', function(req, res) {
  // console.log(JSON.stringify(req.query))
  console.log('connection')
  res.sendFile(__dirname + '/settings.html')

})

// Redirect file requests.
// app.post('/', function(req, res){
//   console.log(req)
//   console.log('connection')
//   res.sendFile(__dirname + '/index.html')

// })

var new_file_url = null

var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './data');
  },
  filename: function (req, file, callback) {
    new_file_url = file.fieldname + '-' + Date.now() + '.jpg'
    callback(null, new_file_url);
  }
});
var upload = multer({ storage : storage}).single('userPhoto');


app.post('/file_upload',function(req, res) {
  // console.log(req.body)
  upload(req, res, function(err) {
    if(err) {
        return res.end("Error uploading file.");
    }
    details[last_change_client_id].image_url = "/data/" + new_file_url
    console.log(details)
    res.sendFile(__dirname + '/file_upload.html')
  });
});








app.get('/test', function(req, res){
  console.log('test connection')
  res.sendFile(__dirname + '/test.html')
})


app.get('/update_id', function(req, res){
  log("Request: Update id " + JSON.stringify(req.query))

  // Check if this is new client.
  if(req.query.hasOwnProperty('old_id'))
    old_id = req.query.old_id
  else
    old_id = null

  new_id = req.query.new_id

  flow.updateClientId(old_id, new_id)

  // Send success message.
  res.sendStatus(200)
})


app.get('/update_location', function(req, res){
  log("Request: Update location " + JSON.stringify(req.query))

  // Check if this is new client.
  if(req.query.hasOwnProperty('id') && req.query.hasOwnProperty('location'))
    flow.updateClientLocation(req.query.id, req.query.location)

  // Send success message.
  res.sendStatus(200)
})

app.get('/post_food', function(req, res){
  log("Request: Post food " + JSON.stringify(req.query))

  // Check if this is new client.
  if(req.query.hasOwnProperty('id') && req.query.hasOwnProperty('params'))
    flow.updateClientLocation(req.query.id, req.query.params)

  // Send success message.
  res.sendStatus(200)
})



var debug_listener = null

log = function(message) {
  if(debug_listener !== null) {
    // If there is a listener, send it the message.
    debug_listener.emit('debug', { message: message })
  }
}

// Add a listener to the server to debug the server.
io.on('connection', function(socket) {
  // Add listener if this is the listener.
  socket.on('listen', function(request) {
    console.log('listener')
    debug_listener = socket
  })
})

// The server.
// The port to listen to.
var port = Number(process.env.PORT || 3000)

// Listen.
server.listen(port, function(){
  console.log('listening on http:\\\\localhost:' + port)
})
