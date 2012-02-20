$(document).ready(function() {
	
	/****************************************************************************************/
	// INITIALIZATION STUFF
	
	// start a new connection when you enter the room
	socket = new io.Socket('letsgohotpot.com', {'port' : 7778});
	socket.connect();
	
	// useful variables
	var currentUserId = $('#userId').text();
	

	/****************************************************************************************/
	// RECIPE NAVIGATION
	
	var sendCurrentStep = function(){
		console.log('sending');
		var currentStepNumber = $('#stepTabs .currentStep a').attr('id').split('-')[1];
		
		var socketMessage = JSON.stringify({
			'type' : 'recipeStep',
			'data' : {
				'stepNumber' : currentStepNumber
			},
			'userId' :  currentUserId
		});
		
		socket.send(socketMessage);
	};
	
	// callback for socket.on('message')
	var updateRecipeStepPositions = function(data) {
		console.log(data);
		
		// no need to update step position markers for yourself
		if (data.userId !== currentUserId) {
		
			// remove existing user position marker for this user
			$('.positionMarker[data-id="' + data.userId + '"]').remove();
			$stepTabToAddMarkerTo = $('#stepTab-' + data.stepNumber).parent();
			$stepTabToAddMarkerTo.append('<div class="positionMarker" data-id=' + data.userId + '>' + data.username + '</div>');
		}
	};

	// Clicking on a recipe step switches the view to that step
	$('#stepTabs li a').click(function(e) {
		console.log('click');
		e.preventDefault();
		$('.step').hide();
		$('#stepTabs .currentStep').removeClass('currentStep');
		var stepNumber = $(this).attr('id').split('-')[1];
		$('#step-' + stepNumber).show();
		$(this).parent().addClass('currentStep');
		
		sendCurrentStep();
	});
	
	// Using arrow keys to go to the next/previous step
	
	var goToPrevStep = function() {
		$('#stepTabs .currentStep').prev().find('a').click();
	};
	
	var goToNextStep = function() {
		$('#stepTabs .currentStep').next().find('a').click();
	};
	
	$(document.documentElement).keydown(function(e){
		console.log('key');
		// left or up key
		if(e.keyCode === 37 || e.keyCode === 38)	{
			console.log('prev');
			goToPrevStep();
		}
		// right or down key
		else if (e.keyCode === 39 || e.keyCode === 40) {
			console.log('next');
			goToNextStep();
		}
	});
	
	// next/previous buttons
	$('#prevButton').click(function(e){
		e.preventDefault();
		goToPrevStep();
	});
	
	$('#nextButton').click(function(e){
		e.preventDefault();
		goToNextStep();
	});
	
	
	/****************************************************************************************/
	// INGREDIENTS PANE
	
	// closes the ingredients pane
	$('.closeButton').click(function(e){
		e.preventDefault();
		$(this).parent().hide();
	});
	
	// toggles ingredients pane visibility
	$('#ingredientsButton').click(function(e){
		e.preventDefault();
		$('#ingredients').toggle();
	});
	
	// crosses out an ingredient when you click on it
	$('#ingredients li').click(function(e){
		$(this).toggleClass('crossedOut');
	});
	
	/****************************************************************************************/
	// WIDGETS
	
	var toggleWidget = function($button, widgetSelector){
		var $widget = $button.closest('.widgets').children(widgetSelector);
		
		$widget.siblings('.widget').hide();
		$widget.toggle();
		
		$button.siblings().removeClass('active');
		$button.toggleClass('active');
	};
	
	$('.widgetNav a').click(function(e){
		e.preventDefault();
		
		// second argument is the class of the button minus the "Button" part, used as a selector for the panel to show/hide
		toggleWidget($(this), '.' + $(this).attr('class').split('Button')[0]);
	});
	
	$('.widgets .closeButton').click(function(e){
		e.preventDefault();
		$(this).parent().hide();
		
		// remove .active class from the widget's button too
		$(this).closest('.widgets').children('.widgetNav').children().removeClass('active');
	});
	
	
	/****************************************************************************************/
	// FOODNOTES
	
	// submits the foodnote
	$('.foodnoteForm').submit(function(e){
		e.preventDefault();
		
		// "this" is the form element
		var $formElement = $(this);
		var noteText = $formElement.children('.note').val();
		
		// send the data directly through sockets instead of AJAX because it's more convenient given my server structure
		// (if we used AJAX, Flask would have needed to initiate the Flask-to-Tornado communication,
		// and I would need to write Tornado code to handle that communication)
		
		var socketMessage = JSON.stringify({
			'type': 'userNote',
			'data': {
				'text' : noteText,
				'snippet_id': $(this).closest('.snippet').attr('data-id'),
				'recipe_id': $('#recipe').attr('data-id')
			},
			'userId': currentUserId
		});
		
		socket.send(socketMessage);
		
		$formElement.hide();
	});
	
	// used as callback in socket.on('message')
	var updateUserNotes = function(data){
		$('.snippet[data-id=' + data.snippetId + ']').append('<div class="usernote" data-id"' + data.noteId + '">' + data.text + '<div class="postedBy">Posted by ' + data.username + '</div></div>');
	};
	
	
	/****************************************************************************************/
	// CHAT BOX STUFF
	
	// toggles chatbox visbility
	$('#chatBoxButton').click(function(e){
		e.preventDefault();
		$('#chatContainer').toggle();
		$('#videoContainer').toggleClass('fullsize')
	});
	
	// submits a chat message
	$('#chatInputForm').submit(function(e){
		e.preventDefault();
		
		var chatMessage = $(this).children('[name=chatMessage]').val();
		
		if(chatMessage !== ''){			
			var socketMessage = JSON.stringify({
				'type' : 'chat',
				'data': {
					'chatMessage' : chatMessage
				},
				'userId' : currentUserId
			});
			
			socket.send(socketMessage);
		}
		
		// clear the input field
		$(this).children('[name=chatMessage]').val('');
	});
	
	// used as callback in socket.on('message')
	var updateChatMessages = function(data){
		var $chatMessages = $('#chatMessages');
		
		$chatMessages.append('<div class="chatMessage"><span class="chatMessageAuthor">' + data.userId + '</span>: <span class="chatMessageBody">' + data.chatMessage + '</span></div>');
		
		// scroll chat messages to bottom
		$chatMessages.scrollTop($chatMessages.scrollTop()+9001);
	};
	
	/****************************************************************************************/
	// SOCKET IO STUFF
	
	// handles socket messages received from backend
	socket.on('message', function(message){
	    var messageJSON = JSON.parse(message);
	    var data = messageJSON.data;
		
		if(messageJSON['type'] == "userNote") {
			updateUserNotes(data);
		}
		
		else if(messageJSON['type'] == 'chat') {
			updateChatMessages(data);
		}
		
		else if(messageJSON['type'] == 'recipeStep') {
			updateRecipeStepPositions(data);
		}
		
	});
	
});