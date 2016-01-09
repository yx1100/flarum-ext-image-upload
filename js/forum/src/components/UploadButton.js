import Component from 'flarum/Component';
import icon from 'flarum/helpers/icon';

export default class UploadButton extends Component {

    /**
    * Load the configured remote uploader service.
    */
    init() {
        // the service type handling uploads
        this.type = app.forum.attribute('flagrow.remote-image-upload.type') || 'oauth';

    }

    /**
    * Show the actual Upload Button.
    *
    * @returns {*}
    */
    view() {
        return m('div', {className: 'Button hasIcon flagrow-image-upload-button'}, [
            icon('paperclip', {className: 'Button-icon'}),
            m('span', {className: 'Button-label'}, app.translator.trans('flagrow-remote-image-upload.forum.buttons.attach')),
            m('input', {
                type: 'file',
                accept: 'image/*',
                name: 'flagrow-image-upload-input',
                onchange: this.process.bind(this)
            })
        ]);
    }

    /**
    * Process the upload event.
    */
    process() {
        // DEBUG
        console.log(this);

        var button = this;

        // wheter the image should be resized
        this.mustResize = app.forum.attribute('flagrow.remote-image-upload.must_resize') || false;
        // max width and height of the uploaded image
        this.maxWidth = app.forum.attribute('flagrow.remote-image-upload.max_width') || null;
        this.maxHeight = app.forum.attribute('flagrow.remote-image-upload.max_height') || null;
        // set the default value (changed later if necessary)
        this.scalingFactor = 1;

        // create the object that is going to load the image from the user's computer
        var reader = new FileReader;
        // this is what the reader is going to do once the file has been loaded into the object
        reader.onload = function(e) {
            // show loader
            button.markLoaderStarted();

            // create an off-screen canvas and an Image object
            var canvas = document.createElement('canvas'),
            canvasContext = canvas.getContext('2d'),
            imageObject = new Image;

            // this is what we are going to do once the image has been loaded into the object
            imageObject.onload = function() {

                // evaluate the scalingFactor to keep aspect ratio
                if(button.mustResize) {
                    button.scalingFactor = Math.min((button.maxWidth/imageObject.width), (button.maxHeight/imageObject.height), 1);
                }

                // set canvas' dimension to target size
                canvas.width = imageObject.width*button.scalingFactor;
                canvas.height = imageObject.height*button.scalingFactor;

                // draw source image into the off-screen canvas:
                canvasContext.drawImage(imageObject, 0, 0, canvas.width, canvas.height);

                // encode image to data-uri with base64 version of compressed image
                var resizedImage = canvas.toDataURL();

                // this formats the file for base64 upload
                var data = resizedImage.substr(resizedImage.indexOf(",") + 1, resizedImage.length);

                // run the service (oauth or the user specificed one)
                this[this.type](data);
            };

            // load the file in the image object
            imageObject.src = e.target.result;
        };

        // actually runs everything on the file that has been selected
        reader.readAsDataURL($("input[name='flagrow-image-upload-input']")[0].files[0]);
    }


    oauth(imageData) {
        // api endpoint
        this.endpoint = app.forum.attribute('flagrow.remote-image-upload.endpoint');
        // client id
        this.client_id = app.forum.attribute('flagrow.remote-image-upload.client_id');
        // client bearer token if non-anonymous
        this.token = app.forum.attribute('flagrow.remote-image-upload.token') || null;
        // whether uploading is anonymous, not account bound
        this.isAnonymous = app.forum.attribute('flagrow.remote-image-upload.anonymous') || true;

        if (this.isAnonymous || !this.token) {
            var headers = {
                client_id: this.client_id
            };
        } else {
            var headers = {
                bearer: this.token
            };
        }

        var button = this;

        $.ajax(this.endpoint, {
            method: 'post',
            // authorization and other headers
            headers: headers,
            data: {
                'image': imageData,
                'type': 'base64'
            },
            // upload success
            success: function (payload, statusCode, xhr) {

                button.markLoaderSuccess();
            },
            // upload error
            error: function(xhr, statusText, error) {

                button.markLoaderFailed();
            },
            statusCode: {
                // unauthorized
                401: function () {
                }
            }
        });
    }

    /**
    * Sets the icon classes of the icon in the upload input field.
    *
    * @param classes
    */
    setIconClasses(classes) {
        this.$('i').removeClass('fa-paperclip fa-spin fa-circle-o-notch fa-check green fa-times red').addClass(classes);
    }

    /**
    * Sets the label of the uploader button and allows disabling submits.
    *
    * @param text
    * @param disable
    */
    setLabel(text, disable = false) {
        this.$('.Button-label').text(text);

        // enable on timeout
        if(disable === false && $('.item-submit > button').attr('disabled') === true ) {
            setTimeout(function() {
                $('.item-submit > button').attr('disabled', false);
            }, 1000);
        } else if(disable === true) {
            $('.item-submit > button').attr('disabled', true);
        }
    }

    /**
    * Modifies the file upload button to indicate upload started.
    */
    markLoaderStarted() {
        this.setIconClasses('fa-spin fa-circle-o-notch');
        this.setLabel(app.translator.trans('flagrow-remote-image-upload.forum.states.loading'), true);
    }

    /**
    * Modifies the file upload button to indicate upload success.
    */
    markLoaderSuccess() {
        this.setIconClasses('fa-check green');
        this.setLabel(app.translator.trans('flagrow-remote-image-upload.forum.states.success'), false);
    }

    /**
    * Modifies the file upload button to indicate upload failed.
    */
    markLoaderFailed() {
        this.setIconClasses('fa-times red');
        this.setLabel(app.translator.trans('flagrow-remote-image-upload.forum.states.error'), false);
    }

    /**
    * Resets the file upload button to its original state.
    */
    resetLoader() {
        this.setIconClasses('fa-paperclip');
    }
}
