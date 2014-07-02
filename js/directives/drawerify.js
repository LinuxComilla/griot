/**
 * Drawerify directive
 * 
 * Converts the contents of a container to a sliding drawer.
 */
app.directive( 'drawerify', function(){
	return {
		restrict: 'A',
		transclude: true,
		replace: true,
		template: "<div class='drawerify-drawer'><a class='drawerify-handle'></a><div class='drawerify-content' ng-transclude></div></div>",
		controller: function( $scope, $element, $attrs ){

			$scope.drawerify = this;

			/************************************************************************
			 INTERNAL UTILITIES
			 ************************************************************************/

			/**
			 * _setElements
			 *
			 * Store jQuery elements of drawer and handle in model.
			 */
			this._setElements = function(){
				this.drawer = $( $element[0] );
				this.handle = this.drawer.children( '.drawerify-handle' );
			}


			/**
			 * chooseBreakpoint
			 * 
			 * Cycle through defined breakpoints and get the properties that apply
			 * to the current container width, then set them in the model. Breakpoints 
			 * are interpreted as min-width media queries.
			 */
			this._chooseBreakpoint = function(){

				// Arbitrarily huge number so we start wider than any actual screen
				var currentBpInt = 10000;

				var props = 'disabled';
				var windowWidth = window.outerWidth;

				// If user has defined a default (max) breakpoint, start with that
				if( this.breakpoints.hasOwnProperty( 'default' ) ){
					props = this.breakpoints.default;
				}

				for( var breakpoint in this.breakpoints ){
					var bpInt = parseInt( breakpoint );
					if( bpInt >= windowWidth && bpInt < currentBpInt ){
						currentBpInt = bpInt;
						props = this.breakpoints[bp];
					}
				}

				if( 'disabled' == props ){
					this.disable();
					return;
				}

				this.orientation = props.orientation || 'vertical';
				this.attachTo = props.attachTo || 'right';
				this.startingState = this.state = props.startingState || 'open';
				this.maxWidth = props.maxWidth || -1;
				this.customStates = props.customStates || null;
			}


			/**
			 * calculateDrawerWidth
			 */
			this._calculateDrawerWidth = function(){

				// If maxWidth is wider than container, use container width
				var widthLimit = Math.min( this.containerWidth, this.maxWidth );

				// If maxWidth is narrower than container, but not narrow enough to
				// accommodate the handle, recalculate
				if( 'horizontal' == this.orientation && ( widthLimit + this.handleWidth ) > this.containerWidth ){
					widthLimit = this.containerWidth - this.handleWidth - 10;
				}

				this.drawerWidth = widthLimit;
			}


			/**
			 * calculateDrawerHeight
			 */
			this._calculateDrawerHeight = function(){

				var heightLimit = this.containerHeight;

				// Default height is 100% of container, but in vertical, we need to
				// make room for the handle
				if( 'vertical' == this.orientation ){
					heightLimit = this.containerHeight - this.handleHeight - 10;
				}

				this.drawerHeight = heightLimit;
			}


			/**
			 * _drawerStaticStyles
			 *
			 * Calculate CSS for drawer that won't change with state.
			 */
			this._drawerStaticStyles = function(){

				var drawerStyles = {
					// Show drawer, which is set to visibility:hidden in CSS to avoid FOUC
					visibility: 'visible',
					width: this.drawerWidth + 'px',
					height: this.drawerHeight + 'px',
					'z-index': 1000
				}

				// Sacrificing dryness for the sake of simplicity ...

				if( 'vertical' == this.orientation && 'left' == this.attachTo ){
					drawerStyles.top = 'auto';
					drawerStyles.right = 'auto';
					// drawerStyles.bottom is dynamic
					drawerStyles.left = '0';
				}
				else if( 'vertical' == this.orientation && 'right' == this.attachTo ){
					drawerStyles.top = 'auto';
					drawerStyles.right = '0';
					// drawerStyles.bottom is dynamic
					drawerStyles.left = 'auto';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					drawerStyles.top = '0';
					drawerStyles.right = 'auto';
					drawerStyles.bottom = '0';
					// drawerStyles.left is dynamic
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					drawerStyles.top = '0';
					// drawerStyles.right is dynamic
					drawerStyles.bottom = '0';
					drawerStyles.left = 'auto';
				}

				this.drawer.css( drawerStyles );

			}

			/**
			 * _handleStaticStyles
			 *
			 * Calculate CSS for handle that won't change with state.
			 */
			this._handleStaticStyles = function(){

				var handleStyles = { display: 'block' };

				if( 'vertical' == this.orientation && 'left' == this.attachTo ){
					handleStyles.top = '-' + this.handleHeight + 'px';
					handleStyles.right = 'auto';
					handleStyles.bottom = 'auto';
					handleStyles.left = '0';
				}
				else if( 'vertical' == this.orientation && 'right' == this.attachTo ){
					handleStyles.top = '-' + this.handleHeight + 'px';
					handleStyles.right = '0';
					handleStyles.bottom = 'auto';
					handleStyles.left = 'auto';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					handleStyles.top = 'auto';
					handleStyles.right = 'auto';
					handleStyles.bottom = '0';
					handleStyles.left = this.drawerWidth + 'px';					
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					handleStyles.top = 'auto';
					handleStyles.right = this.drawerWidth + 'px';
					handleStyles.bottom = '0';
					handleStyles.left = 'auto';					
				}

				this.handle.css( handleStyles );

			}


			/**
			 * _resetStyles
			 *
			 * Reset all style overrides.
			 */
			 /*
			this._resetStyles = function(){
				var controlledStyles = [ 'position', 'top', 'right', 'bottom', 'left', 'display', 'with', 'height' ];
				for( var i=0; i < controlledStyles.length; i++ ){
					this.drawer.css( controlledStyles[i], '' );
				} 
			}
			*/


			/**
			 * _calculateOpenStyles
			 *
			 * Calculate values for OPEN drawer state.
			 */
			this._calculateOpenStyles = function(){

				var pageLocation, openStyles = {};

				if( 'vertical' == this.orientation ){
					pageLocation = this.containerBottom - this.drawerHeight;
					openStyles.bottom = '0';

				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					pageLocation = this.containerLeft + this.drawerWidth;
					openStyles.left = '0';
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					pageLocation = this.containerRight - this.drawerWidth;
					openStyles.right = '0';
				}

				this.states.open = {
					css: openStyles,
					pageLocation: pageLocation
				};
			}

			/**
			 * _calculateClosedStyles
			 *
			 * Calculate CSS for CLOSED drawer state.
			 */
			this._calculateClosedStyles = function(){

				var pageLocation, closedStyles = {};

				if( 'vertical' == this.orientation ){
					pageLocation = this.containerBottom;
					closedStyles.bottom = '-' + this.drawerHeight + 'px';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					pageLocation = this.containerLeft;
					closedStyles.left = '-' + this.drawerWidth + 'px';
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					pageLocation = this.containerRight;
					closedStyles.right = '-' + this.drawerWidth + 'px';
				}

				this.states.closed = {
					css: closedStyles,
					pageLocation: pageLocation
				};
			}

			/**
			 * _calculateCustomStateStyles
			 *
			 * Calculate CSS for CUSTOM drawer states.
			 */
			this._calculateCustomStateStyles = function(){

				// Only vertical layouts use custom states.
				if( ! 'vertical' == this.orientation ){
					return;
				}


				for( customState in this.customStates ){

					var pageLocation, customStyles;

					// ISSUE: This early in load, height() is untrustworthy because some
					// elements haven't rendered yet.
					var selector = this.customStates[customState];
					var $el = $( selector );
					var position = $el.position().top;
					var height = $el.outerHeight();
					var totalHeight = position + height + 10; // Some padding
					var heightDifference = this.drawerHeight - totalHeight;

					pageLocation = this.containerBottom - totalHeight;

					customStyles = {
						bottom: '-' + heightDifference + 'px'
					}

					this.states[ customState ] = {
						css: customStyles,
						pageLocation: pageLocation
					};
				}
			}

			/**
			 * _calculateDragLimits
			 *
			 * Returns an array representing min and max pageX/pageY touchmove vals.
			 */
			this._calculateDragLimits = function(){

				this.dragLimits = {};

				// NOTE: We use drawerHeight and drawerWidth here because they factor
				// in the size of the handle.

				if( 'vertical' == this.orientation ){
					this.minPageY = this.containerBottom - this.drawerHeight;
					this.maxPageY = this.containerBottom;
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					this.minPageX = this.containerLeft;
					this.maxPageX = this.containerLeft + this.drawerWidth;
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					this.minPageX = this.containerRight - this.drawerWidth;
					this.maxPageX = this.containerRight;
				}

			}

			/**
			 * _track
			 *
			 * Syncs drawer movement to touch.
			 */
			this._track = function( touch ){

				this.isMoving = true;
				this.state = null;

				var trackStyles = {};

				if( 'vertical' == this.orientation ){

					if( touch.pageY < this.minPageY || touch.pageY > this.maxPageY ){
						return;
					}

					trackStyles.bottom = '-' + ( this.drawerHeight - ( this.containerBottom - touch.pageY ) ) + 'px';

				}
				else if( 'horizontal' == this.orientation ){

					if( touch.pageX < this.minPageX || touch.pageX > this.maxPageX ){
						return;
					}

					if( 'left' == this.attachTo ){
						trackStyles.left = touch.pageX - this.drawerWidth;
					}
					else if( 'right' == this.attachTo ){
						trackStyles.right = '-' + ( this.drawerWidth - ( this.containerRight - touch.pageX ) ) + 'px';
					}
				}

				this.drawer.css( trackStyles );
			}

			/**
			 * _untrack
			 *
			 * Stop tracking drawer and animate to closest state.
			 */
			this._untrack = function( touch ){

				this.isMoving = false;

				var closestStateDistance = null;
				var key = this.orientation == 'vertical' ? 'pageY' : 'pageX';

				for( var state in this.states ){
					var distance = Math.abs( touch[key] - this.states[state].pageLocation );
					if( ! closestStateDistance || distance < closestStateDistance ){
						closestStateDistance = distance;
						closestState = state;
					}
				}

				this.to( closestState );

			}

			/************************************************************************
			 CALLABLE FUNCTIONS
			 ************************************************************************/

			/**
			 * to
			 *
			 * Transition from one state to another.
			 */
			this.to = function( state, transition ){

				if( 'disabled' == state ){
					this.disable();
					this.state = 'disabled';
					return;
				}

   			var transition = typeof transition !== 'undefined' ? transition : this.defaultSpeed;
				this.drawer.animate( this.states[ state ].css, transition );
				this.state = state;

			}


			/**
			 * toggle
			 *
			 * Toggle between open and closed transitions
			 */
			this.toggle = function(){

				if( this.state == 'open' ){
					this.to( 'closed' );
				} 
				else {
					this.to( 'open' );
				}

			}


			/**
			 * init
			 *
			 * Initialize drawer.
			 */
			this.init = function(){
				this._setElements();
				this.breakpoints = $scope.$eval($attrs.drawerify);
				this.container = this.drawer.offsetParent();
				this.containerWidth = this.container.width();
				this.containerHeight = this.container.height();
				this.containerTop = this.container.offset().top;
				this.containerBottom = this.containerTop + this.containerHeight;
				this.containerLeft = this.container.offset().left;
				this.containerRight = this.containerLeft + this.containerWidth;
				this.defaultSpeed = 300;
				this.handleWidth = 70;
				this.handleHeight = 70;
				this.states = {};
				this._chooseBreakpoint();
				this._calculateDrawerWidth();
				this._calculateDrawerHeight();
				this._drawerStaticStyles();
				this._handleStaticStyles();
				this._calculateOpenStyles();
				this._calculateClosedStyles();
				this._calculateCustomStateStyles();
				this._calculateDragLimits();
				this.to( this.startingState, 0 );
			}

			/**
			 * disable
			 *
			 * Turn off drawerify and reset controlled elements to original CSS.
			 */
			this.disable = function(){
				this.handle.hide();
				this.managedProperties = [ 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'z-index' ];
				angular.forEach( this.managedProperties, function( property ){
					$scope.drawerify.drawer.css( property, '' );
				});
			}


			/*
			$scope.$watch( function(){
				return $('.object-title').height();
			}, function( newVal, oldVal ){
				$scope.drawerify._setupDrawerStates();
				$scope.drawerify.to( 'title', 500 );
			});
			*/

		},
		link: function( scope, elem, attrs ){

			scope.drawerify.init();

			/**
			 * Touchmove listener
			 */
			scope.drawerify.handle.on( 'touchmove', function(e){

				var touch = e.originalEvent.targetTouches[0];
				scope.drawerify._track( touch );

			});

			/**
			 * Touchend listener
			 */
			scope.drawerify.handle.on( 'touchend', function(e){

				var touch = e.originalEvent.changedTouches[0];

				// Drag
				if( scope.drawerify.isMoving ){
					scope.drawerify._untrack( touch );
				} 
				// Click
				else {
					scope.drawerify.toggle();
				}

			});

			/**
			 * Resize listener
			 */
			$(window).on( 'resize orientationchange', function(){
				scope.drawerify.init();
			});


			$('.object-title').on('click', function(){
				scope.drawerify.disable();
			});
		}
	}
});