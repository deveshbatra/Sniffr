// Handles events and UI dynamic changes.

UI = new function() {
  // Variables.
  this.notification_container = null
  var current_tab = 'login'

  // Initialise the UI.
  this.init = function() {
    // Define pointer.
    this.notification_container = document.querySelector('#notification-container')

    // Start events.
    this.enableEvents()
  }

  this.enableEvents = function() {
    $(".input_listened" ).keyup(function() {
      UI.resendForm()
    })
    $(".input_listened2" ).click(function() {
      UI.resendForm()
    })
    $("#food_now_switch").click(function() {
      if($("#food_now_switch").is(":checked"))
        $("#live_message").show()
      else
        $("#live_message").hide()
    })
  }

  this.resendForm = function() {
    socket.emit("form_update", { id: my_id, data: {
      description: $("#food_description").val(),
      live_for_food: $("#food_now_switch").is(":checked"),
      no_people: $("#number_people_offer").val(),
      minutes: $("#minutes_waiting").val()
    }})
  }


  // Show the notification in the UI.
  // def showNotification(message: String): ()
  this.showNotification = function(message) {
    this.notification_container.MaterialSnackbar.showSnackbar({ message: message })
  }

  // Switch context between tabs.
  this.switchTab = function(to) {
    $('#' + current_tab + '-panel-link').removeClass('is-active')
    $('#' + current_tab + '-panel').removeClass('is-active')

    $('#' + to + '-panel').addClass('is-active')
    $('#' + to + '-panel-link').addClass('is-active')
    
    current_tab = to
    // We don't need this for now.
    // $("#main_content").animate({ scrollTop: 0 }, 100);
  }
}
