  // ---- data model, mirrors the Python User / Email / Inbox classes ----
  let idCounter = 1;

  function makeUser(name){
    return { name, inbox: [] };
  }

  function sendEmail(sender, receiver, subject, body){
    const email = {
      id: idCounter++,
      sender: sender.name,
      receiver: receiver.name,
      subject, body,
      timestamp: new Date(),
      read: false,
      stamped: false
    };
    receiver.inbox.unshift(email);
    return email;
  }

  const users = {
    Tory: makeUser('Tory'),
    Ramy: makeUser('Ramy')
  };

  // seed, matching main()
  sendEmail(users.Ramy, users.Tory, 'Re: Hello', 'Hi Tory, hope you are fine.');
  sendEmail(users.Tory, users.Ramy, 'Hello', 'Hi Ramy, just saying hello!');

  let activeUserName = 'Ramy';
  let selectedEmailId = null;

  function fmtTime(d){
    return d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }
  function initials(name){ return name.slice(0,2).toUpperCase(); }

  function unreadCount(user){
    return user.inbox.filter(e => !e.read).length;
  }

  function render(){
    const active = users[activeUserName];

    // mailbox rail
    const mbList = document.getElementById('mailboxList');
    mbList.innerHTML = '';
    Object.values(users).forEach(u => {
      const uc = unreadCount(u);
      const div = document.createElement('div');
      div.className = 'mailbox' + (u.name === activeUserName ? ' active' : '');
      div.innerHTML = `
        <div class="mb-avatar">${initials(u.name)}</div>
        <div class="mb-name">${u.name}</div>
        <div class="mb-count${uc===0?' zero':''}">${uc}</div>
      `;
      div.addEventListener('click', () => {
        activeUserName = u.name;
        selectedEmailId = null;
        render();
      });
      mbList.appendChild(div);
    });

    // inbox pane
    document.getElementById('inboxOwner').textContent = active.name + "'s inbox";
    document.getElementById('inboxCount').textContent =
      active.inbox.length + (active.inbox.length === 1 ? ' message' : ' messages');

    const listEl = document.getElementById('emailList');
    listEl.innerHTML = '';
    if(active.inbox.length === 0){
      listEl.innerHTML = `<div class="empty-state">No mail has arrived.<i>Compose a message to fill this inbox.</i></div>`;
    } else {
      active.inbox.forEach(email => {
        const row = document.createElement('div');
        row.className = 'email-row' + (!email.read ? ' unread' : '') + (email.id === selectedEmailId ? ' selected' : '');
        row.innerHTML = `
          <div class="email-row-main">
            <div class="email-row-top">
              <span class="email-sender">${email.sender}</span>
              <span class="email-time">${fmtTime(email.timestamp)}</span>
            </div>
            <div class="email-subject">${email.subject}</div>
          </div>
          <button class="row-delete" title="Delete" aria-label="Delete email">&times;</button>
        `;
        row.addEventListener('click', (e) => {
          if(e.target.closest('.row-delete')) return;
          selectedEmailId = email.id;
          if(!email.read){
            email.read = true;
            email.stamped = false; // trigger stamp animation
          }
          render();
        });
        row.querySelector('.row-delete').addEventListener('click', () => {
          active.inbox = active.inbox.filter(e => e.id !== email.id);
          if(selectedEmailId === email.id) selectedEmailId = null;
          showToast('Email deleted.');
          render();
        });
        listEl.appendChild(row);
      });
    }

    // reading pane
    const wrap = document.getElementById('letterWrap');
    const email = active.inbox.find(e => e.id === selectedEmailId);
    if(!email){
      wrap.innerHTML = `
        <div class="letter-empty">
          <svg width="60" height="60" viewBox="0 0 54 54"><rect x="6" y="14" width="42" height="28" fill="none" stroke="#6B7280" stroke-width="2"/><path d="M6 16 L27 32 L48 16" fill="none" stroke="#6B7280" stroke-width="2"/></svg>
          <span>Select a message to read it</span>
        </div>`;
      return;
    }
    const alreadyStamped = email.stamped;
    wrap.innerHTML = `
      <div class="letter">
        <div class="letter-meta-row">
          <div>
            <div class="letter-field"><b>From</b>${email.sender}</div>
            <div class="letter-field"><b>To</b>${email.receiver}</div>
            <div class="letter-field"><b>Received</b>${fmtTime(email.timestamp)}</div>
          </div>
        </div>
        <div class="letter-subject">${email.subject}</div>
        <div class="letter-body">${email.body}</div>
        <div class="letter-actions">
          <button id="deleteOpenBtn" class="danger" type="button">Delete</button>
        </div>
        <div class="stamp${alreadyStamped ? '' : ' play'}">RECEIVED<br>${fmtTime(email.timestamp).split(',')[0]}</div>
      </div>
    `;
    email.stamped = true;
    document.getElementById('deleteOpenBtn').addEventListener('click', () => {
      active.inbox = active.inbox.filter(e => e.id !== email.id);
      selectedEmailId = null;
      showToast('Email deleted.');
      render();
    });
  }

  // ---- compose modal ----
  const overlay = document.getElementById('overlay');
  const toField = document.getElementById('toField');

  document.getElementById('composeBtn').addEventListener('click', () => {
    document.getElementById('fromField').value = activeUserName;
    toField.innerHTML = '';
    Object.values(users).filter(u => u.name !== activeUserName).forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.name; opt.textContent = u.name;
      toField.appendChild(opt);
    });
    document.getElementById('subjectField').value = '';
    document.getElementById('bodyField').value = '';
    overlay.classList.add('show');
  });
  document.getElementById('cancelBtn').addEventListener('click', () => overlay.classList.remove('show'));
  overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.classList.remove('show'); });

  document.getElementById('sendBtn').addEventListener('click', () => {
    const subject = document.getElementById('subjectField').value.trim() || '(no subject)';
    const body = document.getElementById('bodyField').value.trim() || '(empty message)';
    const receiver = users[toField.value];
    const sender = users[activeUserName];
    sendEmail(sender, receiver, subject, body);
    overlay.classList.remove('show');
    showToast(`Email sent from ${sender.name} to ${receiver.name}.`);
    render();
  });

  // ---- toast ----
  let toastTimer;
  function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---- clock ----
  function tickClock(){
    document.getElementById('clock').innerHTML =
      `<strong>${new Date().toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})}</strong><br>${new Date().toLocaleTimeString()}`;
  }
  tickClock();
  setInterval(tickClock, 1000);

  render();
