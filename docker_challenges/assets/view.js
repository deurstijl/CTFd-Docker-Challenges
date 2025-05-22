CTFd._internal.challenge.data = undefined

CTFd._internal.challenge.renderer = CTFd._internal.markdown;


CTFd._internal.challenge.preRender = function() {}

CTFd._internal.challenge.render = function(markdown) {

    return CTFd._internal.challenge.renderer.parse(markdown)
}


CTFd._internal.challenge.postRender = function() {
    // const containername = CTFd._internal.challenge.data.docker_image;
    // get_docker_status(containername);
    // createWarningModalBody();
}

document.addEventListener("shown.bs.modal", (event) => {
    // This checks if the challenge modal for dockers is loaded.
    // Which is the start of it all!
    const modal = event.target;
    // Check if it's the challenge modal
    if (modal.id !== "challenge-window") return;
    // Check if this challenge has a docker button
    const dockerBtn = modal.querySelector(".btn-docker-start");
    if (dockerBtn) {
      // This is a Docker challenge !!!!!
      // Lets start the logic:
      
      // Hide the connection info
      const connectionlink = CTFd.lib.$('.challenge-connection-info');
      connectionlink.hide();

      const containername = CTFd._internal.challenge.data.docker_image;
      console.log("docker_image: " + containername);
      get_docker_status(containername);

      createWarningModalBody();

      // Add onclick event listener for the start button.
      dockerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const image = dockerBtn.dataset.image;
        start_container(image); // your plugin's logic
      });
    }
});

function createWarningModalBody(){
    // Creates the Warning Modal placeholder, that will be updated when stuff happens.
    if (CTFd.lib.$('#warningModalBody').length === 0) {
        CTFd.lib.$('body').append('<div id="warningModalBody"></div>');
    }
}

function get_docker_status(container) {
    console.log("Status for: " + container);
    const dockerContainerDiv = CTFd.lib.$('#docker_container');
    dockerContainerDiv.html("");  // Clear existing content

    CTFd.fetch("/api/v1/docker_status")
        .then(response => response.json())
        .then(result => {
            console.log(result.data);
            let matched = false;
            const connectionlink = CTFd.lib.$('.challenge-connection-info');

            result.data.forEach(item => {
                if (item.docker_image === container) {
                    matched = true;

                    const ports = String(item.ports).split(',');
                    const instanceIdShort = String(item.instance_id).substring(0, 10);
                    const revertContainerId = `${instanceIdShort}_revert_container`;

                    let data = ports.map(port => `
                        <div>
                            <strong>Host:</strong> <span class="text-monospace me-3">${item.host}</span>
                            <strong>Port:</strong> <span class="text-monospace">${String(port).trim()}</span>
                        </div>
                    `).join('');

                    dockerContainerDiv.html(`
                        <div class="mb-2"><strong>Docker Container Information:</strong></div>
                        ${data}
                        <div class="mt-2" id="${revertContainerId}"></div>
                    `);

                    // Update challenge-connection-info and show it
                    connectionlink.html(connectionlink.html()
                        .replace(/host/gi, item.host)
                        .replace(/port|\b\d{5}\b/gi, ports[0].split("/")[0]));

                    CTFd.lib.$(".challenge-connection-info").each(function () {
                        const $span = CTFd.lib.$(this);
                        const html = $span.html();

                        if (!html.includes("<a")) {
                            const urlMatch = html.match(/(http[s]?:\/\/[^\s<]+)/);
                            if (urlMatch) {
                                const url = urlMatch[0];
                                const linked = html.replace(url, `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
                                $span.html(linked);
                            }
                        }
                    });
                    connectionlink.show();

                    const countDownDate = new Date(parseInt(item.revert_time) * 1000).getTime();

                    const intervalId = setInterval(function () {
                        const now = new Date().getTime();
                        const distance = countDownDate - now;
                        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                        let seconds = Math.floor((distance % (1000 * 60)) / 1000);
                        seconds = seconds < 10 ? "0" + seconds : seconds;

                        const revertContainer = CTFd.lib.$(`#${revertContainerId}`);

                        if (distance < 0) {
                            clearInterval(intervalId);

                            const revertBtn = document.createElement('button');
                            revertBtn.className = 'btn btn-dark me-2';
                            revertBtn.innerHTML = '<i class="fas fa-redo"></i> Revert';
                            revertBtn.addEventListener('click', () => start_container(item.docker_image));

                            const stopBtn = document.createElement('button');
                            stopBtn.className = 'btn btn-dark';
                            stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
                            stopBtn.addEventListener('click', () => stop_container(item.docker_image));

                            revertContainer.html('');
                            revertContainer[0].appendChild(revertBtn);
                            revertContainer[0].appendChild(stopBtn);
                        } else {
                            revertContainer.text(`Stop or Revert Available in ${minutes}:${seconds}`);
                        }
                    }, 1000);
                }
            });

            // If no matching container, display start button
            if (!matched) {
                connectionlink.hide();
                const startBtn = document.createElement('button');
                startBtn.className = 'btn btn-dark';
                startBtn.innerHTML = '<i class="fas fa-play"></i> Start Docker Instance for challenge';
                startBtn.addEventListener('click', () => start_container(CTFd._internal.challenge.data.docker_image));

                dockerContainerDiv.html('');
                dockerContainerDiv[0].appendChild(startBtn);
            }
        })
        .catch(error => {
            console.error('Error fetching docker status:', error);
        });
}



function stop_container(container) {
    if (confirm("Are you sure you want to stop the container for: \n" + CTFd._internal.challenge.data.name)) {
        CTFd.fetch("/api/v1/container?name=" + encodeURIComponent(container) + 
                   "&challenge=" + encodeURIComponent(CTFd._internal.challenge.data.name) + 
                   "&stopcontainer=True", {
            method: "GET"
        })
        .then(function (response) {
            return response.json().then(function (json) {
                if (response.ok) {
                    updateWarningModal({
                        title: "Attention!",
                        warningText: "The Docker container for <br><strong>" + CTFd._internal.challenge.data.name + "</strong><br> was stopped successfully.",
                        buttonText: "Close",
                        onClose: function () {
                            get_docker_status(container);  // ← Will be called when modal is closed
                        }
                    });
                } else {
                    throw new Error(json.message || 'Failed to stop container');
                }
            });
        })
        .catch(function (error) {
            updateWarningModal({
                title: "Error",
                warningText: error.message || "An unknown error occurred while stopping the container.",
                buttonText: "Close",
                onClose: function () {
                    get_docker_status(container);  // ← Will be called when modal is closed
                }
            });

        });
    }
}

function start_container(container) {
    CTFd.lib.$('#docker_container').html('<div class="text-center"><i class="fas fa-circle-notch fa-spin fa-1x"></i></div>');
    CTFd.fetch("/api/v1/container?name=" + encodeURIComponent(container) + "&challenge=" + encodeURIComponent(CTFd._internal.challenge.data.name), {
        method: "GET"
    }).then(function (response) {
        return response.json().then(function (json) {
            if (response.ok) {
                console.log()
                get_docker_status(container);

    
                updateWarningModal({
                    title: "Attention!",
                    warningText: "A Docker container is started for you.<br>Note that you can only revert or stop a container once per 5 minutes!",
                    buttonText: "Got it!"
                });

            } else {
                throw new Error(json.message || 'Failed to start container');
            }
        });
    }).catch(function (error) {
        // Handle error and notify the user
        updateWarningModal({
            title: "Error!",
            warningText: error.message || "An unknown error occurred when starting your Docker container.",
            buttonText: "Got it!",
            onClose: function () {
                get_docker_status(container);  // ← Will be called when modal is closed
            }
        });
    });
}

// WE NEED TO CREATE THE MODAL FIRST, and this should be only used to fill it.

function updateWarningModal({ title, warningText, buttonText, onClose } = {}) {
    const modalHTML = `
        <div id="warningModal" class="custom-modal-backdrop">
          <div class="custom-modal-content">
            <div class="custom-modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" id="warningCloseBtn" class="custom-modal-close">&times;</button>
            </div>
            <div class="custom-modal-body">
              ${warningText}
            </div>
            <div class="custom-modal-footer">
              <button type="button" class="btn btn-secondary" id="warningOkBtn">${buttonText}</button>
            </div>
          </div>
        </div>
    `;
    CTFd.lib.$("#warningModalBody").html(modalHTML);

    // Show the modal
    CTFd.lib.$("#warningModal").show();

    // Close logic
    const closeModal = () => {
        CTFd.lib.$("#warningModal").hide();
        if (typeof onClose === 'function') {
            onClose();  
        }
    };

    // Close on button or background click
    CTFd.lib.$("#warningCloseBtn").on("click", closeModal);
    CTFd.lib.$("#warningOkBtn").on("click", closeModal);
    CTFd.lib.$("#warningModal").on("click", function (e) {
        if (e.target === this) closeModal();
    });
}

// Our own submit, which will be picked up by challenges.js
CTFd._internal.challenge.submit = async function () {
    const input = document.querySelector("#challenge-input");
    const chalId = document.querySelector("#challenge-id");
  
    if (!input || !chalId) {
      throw new Error("Challenge input or ID not found");
    }
  
    const payload = {
      challenge_id: parseInt(chalId.value, 10),
      submission: input.value
    };
  
    const response = await CTFd.fetch("/api/v1/challenges/attempt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin", // optional but often included for cookies/session
      body: JSON.stringify(payload)
    });
  
    const result = await response.json();
    
    // Check if the submission was correct
    if (result?.data?.status === "correct") {
        get_docker_status(CTFd._internal.challenge.data.docker_image);
        console.log("Submission is correct!");
    }
    if (result?.data?.status === "incorrect") {
        console.log("Submission is INcorrect!");
    }
    return result;
};
  
