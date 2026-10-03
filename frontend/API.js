document.addEventListener("DOMContentLoaded", function () {
  // THEME TOGGLE
  var themeBtn = document.getElementById("themeToggle");
  var savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    if (themeBtn) themeBtn.textContent = "☀️";
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      document.body.classList.toggle("dark");
      if (document.body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
        themeBtn.textContent = "☀️";
      } else {
        localStorage.setItem("theme", "light");
        themeBtn.textContent = "🌙";
      }
    });
  }

  // ACTIVE NAV
  var currentPage = window.location.pathname.split("/").pop();
  if (currentPage === "" || currentPage === "index.html") currentPage = "main.html";
  document.querySelectorAll("header nav a").forEach(function (link) {
    link.classList.remove("active");
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
  });

  // RECORD PAYMENT PAGE - FIGMA DROPDOWN
  var nameInput = document.getElementById("memberName");
  var amountInput = document.getElementById("amountPaid");
  var dateInput = document.getElementById("paymentDate");
  var saveBtn = document.getElementById("saveBtn");
  var msgBox = document.getElementById("messageBox");
  var memberSuggBox = document.getElementById("memberSuggestions");

  function showMessage(text, type) {
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.className = "messageBox " + type;
    msgBox.style.display = "block";
    setTimeout(function () { msgBox.style.display = "none"; }, 2500);
  }

  function showMemberSuggest(val){
    if(!memberSuggBox) return;
    if(!val){
      memberSuggBox.style.display="none";
      return;
    }
    var members = JSON.parse(localStorage.getItem("members")) || [];
    var matches = members.filter(function(m){
      return m.name.toLowerCase().includes(val.toLowerCase());
    });

    if(matches.length === 0){
      memberSuggBox.style.display="none";
      return;
    }

    memberSuggBox.innerHTML = "";
    matches.forEach(function(m){
      var div = document.createElement("div");
      var countText = m.payments.length + (m.payments.length === 1? " payment" : " payments");
      div.innerHTML = "<strong>" + m.name + "</strong> <span>" + countText + "</span>";

      // FIXED: stopPropagation so document click doesn't kill it
      div.addEventListener("click", function(e){
        e.stopPropagation();
        nameInput.value = m.name;
        memberSuggBox.style.display="none";
        amountInput.focus();
      });
      memberSuggBox.appendChild(div);
    });
    memberSuggBox.style.display="block";
  }

  if (nameInput) {
    nameInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^A-Za-z ]/g, "");
      showMemberSuggest(this.value);
    });
    nameInput.addEventListener("focus", function(){
      showMemberSuggest(this.value);
    });
  }

  if (dateInput) {
    dateInput.value = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var name = nameInput.value.trim();
      var amount = parseFloat(amountInput.value);
      if (!name ||!amount) { showMessage("Enter name and amount", "error"); return; }
      var members = JSON.parse(localStorage.getItem("members")) || [];
      var existing = members.find(function (m) { return m.name.toLowerCase() === name.toLowerCase(); });
      var dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      if (existing) {
        existing.payments.push({ amount: amount, date: dateStr });
        existing.total += amount;
      } else {
        members.push({ name: name, total: amount, payments: [{ amount: amount, date: dateStr }] });
      }
      localStorage.setItem("members", JSON.stringify(members));
      if(!existing){
        showMessage("New member " + name + " has been registered and payment for " + amount.toFixed(2) + " recorded!", "success");
      } else {
        showMessage("Payment for " + name + " saved!", "success");
      }
      nameInput.value = ""; amountInput.value = "";
      if(memberSuggBox) memberSuggBox.style.display="none";
    });
  }

  // MEMBERS PAGE
  var listDiv = document.getElementById("memberList");
  var search = document.getElementById("searchInput");
  var suggBox = document.getElementById("suggestions");
  var allMembers = JSON.parse(localStorage.getItem("members")) || [];

  function render(filter) {
    if (!listDiv) return;
    filter = filter || "";
    listDiv.innerHTML = "";
    var filtered = allMembers.filter(function (m) {
      return m.name.toLowerCase().includes(filter.toLowerCase());
    });
    var sub = document.querySelector(".subtitle");
    if (sub) sub.textContent = filtered.length + " registered members. Click a name to view their payment history.";
    if (filtered.length === 0) {
      listDiv.innerHTML = '<p style="text-align:center; padding:30px; color:#888;">No members found.</p>';
      return;
    }
    filtered.forEach(function (m) {
      var lastPaid = m.payments[m.payments.length - 1].date;
      var row = document.createElement("div");
      row.className = "memberRow";
      row.style.cursor = "pointer";
      row.innerHTML =
        '<div class="left"><strong>' + m.name + '</strong><span>Last paid: ' + lastPaid + '</span></div>' +
        '<div class="right">' +
          '<span class="badge">GHS' + m.total.toFixed(2) + '</span>' +
          '<small>' + m.payments.length + ' pmt</small>' +
          '<div class="menuWrap">' +
            '<button class="dotsBtn">⋮</button>' +
            '<div class="dotsMenu"><button class="deleteBtn">Delete</button></div>' +
          '</div>' +
        '</div>';
      row.addEventListener("click", function (e) {
        if (e.target.closest(".menuWrap")) return;
        localStorage.setItem("selectedMember", m.name);
        window.location.href = "member-details.html?name=" + encodeURIComponent(m.name);
      });
      var dotsBtn = row.querySelector(".dotsBtn");
      var dotsMenu = row.querySelector(".dotsMenu");
      dotsBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".dotsMenu").forEach(function (o) { if (o!== dotsMenu) o.classList.remove("show"); });
        dotsMenu.classList.toggle("show");
      });
      row.querySelector(".deleteBtn").addEventListener("click", function (e) {
        e.stopPropagation();
        if (confirm("Delete " + m.name + "?")) {
          allMembers = allMembers.filter(function (x) { return x.name!== m.name; });
          localStorage.setItem("members", JSON.stringify(allMembers));
          render(search? search.value : "");
        }
      });
      listDiv.appendChild(row);
    });
  }

  function showSuggestions(val) {
    if (!suggBox ||!val) { if (suggBox) suggBox.style.display = "none"; return; }
    var matches = allMembers.filter(function (m) { return m.name.toLowerCase().includes(val.toLowerCase()); }).slice(0, 5);
    if (matches.length === 0) { suggBox.style.display = "none"; return; }
    suggBox.innerHTML = "";
    matches.forEach(function (m) {
      var div = document.createElement("div");
      var idx = m.name.toLowerCase().indexOf(val.toLowerCase());
      div.innerHTML = m.name.substring(0, idx) + "<b>" + m.name.substring(idx, idx + val.length) + "</b>" + m.name.substring(idx + val.length);
      div.addEventListener("click", function (e) {
        e.stopPropagation();
        search.value = m.name;
        suggBox.style.display = "none";
        render(m.name);
      });
      suggBox.appendChild(div);
    });
    suggBox.style.display = "block";
  }

  if (search) {
    search.addEventListener("input", function (e) {
      render(e.target.value);
      showSuggestions(e.target.value);
    });
  }

  // FIXED CLICK OUTSIDE - THIS WAS THE BUG
  document.addEventListener("click", function (e) {
    if (suggBox &&!e.target.closest("#suggestions") && e.target!== search) {
      suggBox.style.display = "none";
    }
    if (memberSuggBox &&!e.target.closest("#memberSuggestions") && e.target!== nameInput) {
      memberSuggBox.style.display = "none";
    }
    if (!e.target.closest(".menuWrap")) {
      document.querySelectorAll(".dotsMenu").forEach(function (m) { m.classList.remove("show"); });
    }
  });

  render();

  // MEMBER DETAILS PAGE
  var detailName = document.getElementById("detailName");
  if (detailName) {
    var params = new URLSearchParams(window.location.search);
    var selectedName = params.get("name") || localStorage.getItem("selectedMember");
    var member = allMembers.find(function (x) { return x.name === selectedName; });
    if (member) {
      detailName.textContent = member.name;
      document.getElementById("detailSince").textContent = "Member since " + member.payments[0].date;
      document.getElementById("detailTotal").textContent = "GHS" + member.total.toFixed(2);
      document.getElementById("detailCount").textContent = member.payments.length;
      document.getElementById("detailAvg").textContent = "GHS" + (member.total / member.payments.length).toFixed(2);
      var body = document.getElementById("historyBody");
      body.innerHTML = "";
      member.payments.forEach(function (p) {
        body.innerHTML += '<div class="row"><span>' + p.date + '</span><span>GHS' + p.amount.toFixed(2) + '</span></div>';
      });
      document.getElementById("historyTotal").textContent = "GHS" + member.total.toFixed(2);
    }
  }
});