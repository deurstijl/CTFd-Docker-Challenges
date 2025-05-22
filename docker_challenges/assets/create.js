CTFd.plugin.run((_CTFd) => {
    const md = _CTFd.lib.markdown();
  
    // Handle tab preview for description
    document.querySelectorAll('a[data-bs-toggle="tab"]').forEach((tab) => {
      tab.addEventListener('shown.bs.tab', (event) => {
        if (event.target.hash === '#new-desc-preview') {
          const editorValue = document.getElementById('new-desc-editor').value;
          const preview = document.querySelector(event.target.hash);
          if (preview) {
            preview.innerHTML = md.render(editorValue);
          }
        }
      });
    });
  
    // Tooltip initialization (Bootstrap 5)
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
      new bootstrap.Tooltip(el);
    });
  
    // Fetch docker options
    fetch("/api/v1/docker")
      .then((res) => res.json())
      .then((result) => {
        const data = result.data;
        const dockerForm = document.forms.docker_form;
        const dockerSelect = document.getElementById("dockerimage_select");
  
        data.forEach((item) => {
          if (item.name === "Error in Docker Config!") {
            dockerForm.dockerimage_select.disabled = true;
            const label = document.querySelector("label[for='DockerImage']");
            if (label) {
              label.textContent = `Docker Image ${item.name}`;
            }
          } else {
            const opt = document.createElement("option");
            opt.value = item.name;
            opt.textContent = item.name;
            dockerSelect.appendChild(opt);
          }
        });
      });
  });
  