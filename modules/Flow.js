// Main flow for each new connection. i.e. user connects -> user enters name ->
// user selects new game -> user plays game ...

module.exports = function() {
  var clients = new Object()
  var offers = new Array()

  // Update id of client. old_id is null if adding a new client.
  this.updateClientId = function(old_id, new_id) {
    if(old_id !== null) {
      // Client previously registered.
      if(clients.hasOwnProperty(old_id.toString())) {
        // Update the client id.
        clients[new_id.toString()] = clients[old_id.toString()]
        log("Update client: " + old_id.toString() + " to: " + new_id.toString())
        delete clients[old_id.toString()]
      } else {
        clients[new_id.toString()] = new Object()
        log("New client: " + new_id.toString() + " (previously not existing)")
      }
    } else {
      // Add a new client to the list.
      clients[new_id.toString()] = new Object()
      log("New client: " + new_id.toString())
    }
  }

  // Update location of a client.
  this.updateClientLocation = function(id, location) {
    if(clients.hasOwnProperty(id.toString())) {
      // Save location.
      clients[id.toString()].location = location
    } else {
      // Client doesn't exist.
      log("Error: Update location of non-existent client " + id.toString())
    }
  }

  // Post food.
  this.postFood = function(id, params) {
    log("New food: " + params.description + " from " + id.toString())

    var food = new Object()
    food.description = params.description
    food.location = params.location
    food.id = offers.length
    offers.push(food)

    // Let everyone know.
    for(var client_id in clients) {
      if(clients.hasOwnProperty(client_id) && client_id.toString() !==
          id.toString()) {
        // If this is not the person offering the food.

        // TODO. Location filtering.
        this.notify(client_id, food)
      }
    }

  }

  // Let client know about the food.
  this.notify = function(id, food) {

    // Set the headers
    var headers = {
        'Authorization: key=':       'YOUR_SERVER_KEY',
        'Content-Type':     'application/json'
    }

    // Configure the request
    var options = {
        url: 'https://fcm.googleapis.com/fcm/send',
        method: 'POST',
        headers: headers,
        form: food  // Data?
    }

    // Start the request
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // Print out the response body
            console.log(body)
        }
    })
  }
}
