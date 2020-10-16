const DB_NAME = "addressbook";
const DB_VERSION = 1;
// const CONTACTS_URL = './api/Contact';
const CONTACTS_URL = '../mock-contacts.json';
// const SAVE_URL = './api/Account/Save';
let db;

function openDB() {
  var request = indexedDB.open(DB_NAME, 1);
  request.onsuccess = function (event) {
    db = this.result;

    var transaction = db.transaction('contacts', 'readonly');
    var objectStore = transaction.objectStore('contacts');
    // compareIndexedToSql(objectStore);
  };
  request.onerror = function (event) {
    console.error(event);
  };
  request.onupgradeneeded = function (event) {
    var contactsObjectStore = event.target.result.createObjectStore("contacts", { keyPath: 'EmployeeID' });
    var groupObjectStore = event.target.result.createObjectStore("groups", { keyPath: 'groupId' });
    contactsObjectStore.createIndex("UpdateTime", "UpdateTime", { unique: false });
  };
}

// async function compareIndexedToSql(objectStore) {
//   var sqlContactsCount = getSqlContactsCount();

//   if ('getAll' in objectStore) {
//     objectStore.getAll().onsuccess = function (event) {
//       var result = event.target.result;
//       var needBackup = (!result) || (result.length != sqlContactsCount);
//       if (needBackup) {
//         getBackup().then(function () {
//           app.getContactsSaved();
//           app.getGroups();
//         });
//       } else {
//         app.getContactsSaved();
//         app.getGroups();
//       }
//     };
//   } else {
//     var contactsArray = [];
//     objectStore.openCursor().onsuccess = function (event) {
//       var cursor = event.target.result;
//       if (cursor) {
//         contactsArray.push(cursor.value);
//         cursor.continue();
//       } else {
//         var result = event.target.result;
//         var needBackup = (!result) || (result.length != sqlContactsCount);
//         if (needBackup) {
//           getBackup().then(function () {
//             app.getContactsSaved();
//             app.getGroups();
//           });
//         } else {
//           app.getContactsSaved();
//           app.getGroups();
//         }
//       }
//     };
//   }
// }

// function getSqlContactsCount() {
//   return localStorage.getItem('contacts').split(";").length - 1;
// }

// async function getBackup() {
//   const contacts = localStorage.getItem('contacts');
//   const groups = localStorage.getItem('groups');

//   if (contacts && contacts.length > 0) await getBackupContacts(contacts);
//   if (groups && groups.length > 0) await getBackupGroups(groups);
//   return true;
// }

// async function getBackupContacts(contacts) {
//   var contacts = contacts.split(";");
//   contacts.pop();
//   contacts.forEach(function (e) {
//     var contactDetail = e.split(",");
//     var contact = {};
//     contact.EmployeeID = parseInt(contactDetail[0]);
//     contact.Saved = (contactDetail[1] === 'true');
//     contact.GroupId = parseInt(contactDetail[2]);
//     contact.Latest = contactDetail[3] === 'null' ? null : contactDetail[3];
//     var dateTime = new Date(contactDetail[4] + "Z");
//     contact.UpdateTime = dateTime;
//     contact.LocalName = contactDetail[5];
//     contact.EnglishName = contactDetail[6];
//     contact.Alias = contactDetail[7];
//     contact.EMailAddress = contactDetail[8];
//     contact.ExtNo = contactDetail[9];
//     contact.DeptCode = contactDetail[10];
//     var request = db.transaction(["contacts"], "readwrite")
//       .objectStore("contacts")
//       .put(contact);
//   });
// }
// async function getBackupGroups(groups) {
//   var groups = groups.split(";");
//   groups.pop();
//   groups.forEach(function (e) {
//     var groupDetail = e.split(",");
//     var group = {};
//     group.groupId = parseInt(groupDetail[0]);
//     group.name = groupDetail[1];
//     var request = db.transaction(["groups"], "readwrite")
//       .objectStore("groups")
//       .put(group);
//   });
// }
openDB();

// function saveData() {
//   var postData = { UserName: localStorage.getItem('name'), contacts: app.contactsSaved, groups: app.groups };

//   if (navigator.sendBeacon) {
//     navigator.sendBeacon(SAVE_URL, JSON.stringify(postData));
//   } else {
//     var client = new XMLHttpRequest();
//     client.open("POST", SAVE_URL, false);
//     client.setRequestHeader("Content-Type", "application/json");
//     client.send(JSON.stringify(postData));
//   }
// }

window.onpopstate = popState;

function popState(event) {
  var state = event.state;
  if (!state) {
    return;
  }

  var isHomePage = (state === app.homeContentDefault);
  var isSavedPage = (state === app.savedContentDefault);
  var isGroupPage = (state === app.groupContentDefault);
  var isSearchPage = (state === "search");
  if (isHomePage) {
    document.getElementById("home-tab").click();
  }
  else if (isSavedPage) {
    document.getElementById("saved-tab").click();
  }
  else if (isGroupPage) {
    document.getElementById("group-tab").click();
  } else if (isSearchPage) {
    app.homeContent = 'search';
  }
}

var NavSearch = Vue.component('nav-search', {
  props: {
    content: {
      type: String,
      required: true
    }
  },
  data: function () {
    return {
      search: ''
    }
  },
  watch: {
    search: function () {
      if (this.search.length > 0) {
        app.homeContent = "search";
        this.pushState();
      } else {
        app.homeContent = "historyPreview";
      }
      this.setResults();
    }
  },
  methods: {
    onSearchFocus: function (event) {
      var isEmptySearch = !this.search && app.homeContent != "search";
      var isBackToSearch = this.search && app.homeContent == "detail";
      if (isEmptySearch) {
        app.homeContent = 'historyPreview';
      } else if (isBackToSearch) {
        app.homeContent = 'search';
      }
      this.pushState();
    },
    pushState: function () {
      var state = history.state;
      if (state == "history") {
        history.pushState(app.homeContent, "", "#home-search");
      } else if (state == "historyPreview" || state == "search") {
        history.replaceState(app.homeContent, "", "#home-search");
      }
    },
    setResults: function () {
      if (!this.search) return;
      app.results = this.getResults();
    },
    getResults: function () {
      var search = this.search.trim().toLowerCase();
      var contacts = app.contacts.filter((contact) => {
        if (search.indexOf(' ') > -1) {
          var searchArray = this.removeNullItemInArray(search.split(" "));
          return this.isDeptAliasFilterPass(contact, searchArray);
        } else {
          return this.isSingleFilterPass(contact, search);
        }
      });
      contacts = this.sortBySearchDeptOrAlias(search, contacts);
      return contacts;
    },
    isSingleFilterPass: function (contact, search) {
      var hasName = contact.LocalName.toLowerCase().indexOf(search) > -1;
      var hasAlias = contact.Alias.toLowerCase().indexOf(search) > -1;
      var hasDept = contact.DeptCode.toLowerCase().indexOf(search) > -1;
      return (hasName || hasAlias || hasDept) ? true : false;
    },
    isDeptAliasFilterPass: function (contact, searchArray) {
      var hasDept = contact.DeptCode.toLowerCase().indexOf(searchArray[0]) > -1;
      var hasAlias = contact.Alias.toLowerCase().indexOf(searchArray[1]) > -1;
      return (hasDept && hasAlias) ? true : false;
    },
    removeNullItemInArray: function (searchArray) {
      return searchArray.filter((search) => {
        if (search) return true;
      });
    },
    sortBySearchDeptOrAlias: function (search, contacts) {
      var isDept = search.length <= 2 || parseInt(search[1]);
      var sortType = isDept ? "DeptCode" : "Alias";
      var searchLength = search.length;
      contacts.sort(function (a, b) {
        var nameA = a[sortType].toLowerCase();
        var nameB = b[sortType].toLowerCase();
        if (nameA.substring(0, searchLength) === search) {
          return -1;
        } else if (nameB.substring(0, searchLength) === search) {
          return 1;
        } else {
          return 0;
        }
      });
      return contacts;
    },
    onSubmit: function () {
      document.getElementById("searchInput").blur();
      this.setResults();
    }
  },
  template: `
    <nav class="navbar navbar-dark bg-light justify-content-center border-bottom shadow-sm">
      <a href="#">
        <img src="./images/logo.png" width="133" height="20" alt="">
      </a>
      <form v-on:submit.prevent="onSubmit" class="search-form">
        <input type="search" class="form-control my-2" id="searchInput" placeholder="請輸入搜尋內容，如姓名、部門、Alias" v-model="search" @focus="onSearchFocus">
      </form>
    </nav>
  `
})

var CardHistory = Vue.component('card-history', {
  props: {
    contact: {
      type: Object,
      required: true
    }
  },
  computed: {
    shortEmail: function () {
      var email = this.contact.EMailAddress;
      email = email.substring(0, email.indexOf("@"));
      return email;
    }
  },
  template: `
    <div class="card history-card mb-2" @click="$emit('click-home')">
      <div class="card-body p-3 d-flex justify-content-between">
        <div class="d-flex flex-column">
          <h5 class="card-title">{{ contact.LocalName }}</h5>
          <p class="card-text text-muted">{{ contact.DeptCode }} {{ contact.Alias }}</p>
        </div>
        <div class="d-flex flex-column" v-if="contact.Latest === 'ext'">
          <div class="d-flex ml-auto card-title">分機</div>
          <p class="card-text">
            <extno-link :extno="contact.ExtNo" @update-latest="$emit('update-latest', 'ext')"></extno-link>
          </p>
        </div>
        <div class="d-flex flex-column" v-else-if="contact.Latest === 'phone'">
          <div class="d-flex ml-auto card-title">行動電話</div>
          <!-- <p class="card-text"><a :href="'tel:' + contact.phone">{{ contact.phone }}</a></p> -->
        </div>
        <div class="d-flex flex-column" v-else-if="contact.Latest == 'mail'">
          <div class="d-flex ml-auto card-title">電子郵件<br/></div>
          <p class="card-text text-right"><a :href="'mailto:+' + contact.EMailAddress">{{ shortEmail }}</a></p>
        </div>
      </div>
    </div>
  `
})

var CardHistoryPreview = Vue.component('card-history-preview', {
  props: {
    contact: {
      type: Object,
      required: true
    }
  },
  computed: {
    shortEmail: function () {
      var email = this.contact.EMailAddress;
      email = email.substring(0, email.indexOf("@"));
      return email;
    }
  },
  template: `
    <div class="card history-card mb-2">
      <div class="card-body p-3 d-flex justify-content-between">
        <div>
          <h5 class="card-title">{{ contact.LocalName }}</h5>
          <p class="card-text text-muted">{{ contact.DeptCode }} {{ contact.Alias }}</p>
        </div>
        <div class="d-flex flex-column" v-if="contact.Latest === 'ext'">
          <div class="d-flex ml-auto card-title">分機</div>
          <p class="card-text">
            <extno-link :extno="contact.ExtNo" @update-latest="$emit('update-latest', 'ext')"></extno-link>
          </p>
        </div>
        <div class="d-flex flex-column" v-else-if="contact.Latest === 'phone'">
          <div class="d-flex ml-auto card-title">行動電話</div>
          <!-- <p class="card-text text-primary">{{ contact.phone }}</p> -->
        </div>
        <div class="d-flex flex-column" v-else-if="contact.Latest == 'mail'">
          <div class="d-flex ml-auto card-title">電子郵件<br/></div>
          <p class="card-text text-primary text-right">{{ shortEmail }}</p>
        </div>
      </div>
    </div>
  `
})

var CardContact = Vue.component('card-contact', {
  props: {
    contact: {
      type: Object,
      required: true
    }
  },
  template: `
    <div class="card mb-2" @click="$emit('click-contact')">
      <div class="card-body">
        <h5 class="card-title">{{ contact.LocalName }}</h5>
        <h6 class="card-subtitle mt-2 text-muted">{{ contact.DeptCode }} {{ contact.Alias }}</h6>
      </div>
    </div>
  `
})

var ContactDetail = Vue.component('contact-detail', {
  props: {
    contact: {
      type: Object,
      required: true
    },
    groups: {
      type: Array,
      required: false
    }
  },
  methods: {
    savedContact: function (save) {
      this.contact.Saved = save;
      this.contact.UpdateTime = new Date();
      var request = db.transaction(["contacts"], "readwrite")
        .objectStore("contacts")
        .put(this.contact);
      request.onsuccess = function (event) {
        app.getContactsSaved();
      };
    }
  },
  template: `
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">{{ contact.LocalName }}</h5>
        <h6 class="card-subtitle mt-2 text-muted">{{ contact.DeptCode }} {{ contact.Alias }}</h6>
      </div>
      <ul class="list-group list-group-flush">
        <li class="list-group-item">
          分機<br/>
          <extno-link :extno="contact.ExtNo" @update-latest="$emit('update-latest', 'ext')"></extno-link>
        </li>
        <li class="list-group-item">
          行動電話<br/>
        </li>
        <li class="list-group-item">
          電子郵件<br/>
          <a :href="'mailto:' + contact.EMailAddress" @click="$emit('update-latest', 'mail')">{{ contact.EMailAddress }}</a>
        </li>
      </ul>
      <div class="card-body d-flex justify-content-end">
        <div class="d-flex" v-if="contact.Saved && contact.GroupId">
          <button class="btn btn-success mr-2" @click="savedContact(false)"><i class="fas fa-check"></i> 常用</button>
          <group-button :contact="contact" :groups="groups" :isGrouped="true"></group-button>
        </div>
        <div class="d-flex" v-else-if="contact.Saved && !contact.GroupId">
          <button class="btn btn-success mr-2" @click="savedContact(false)"><i class="fas fa-check"></i> 常用</button>
          <group-button :contact="contact" :groups="groups" :isGrouped="false"></group-button>
        </div>
        <div class="d-flex" v-else-if="!contact.Saved && contact.GroupId">
          <button class="btn btn-outline-secondary mr-2" @click="savedContact(true)"><i class="fas fa-star"></i> 加入常用</button>
          <group-button :contact="contact" :groups="groups" :isGrouped="true"></group-button>
        </div>
        <div class="d-flex" v-else>
          <button class="btn btn-outline-secondary mr-2" @click="savedContact(true)"><i class="fas fa-star"></i> 加入常用</button>
          <group-button :contact="contact" :groups="groups" :isGrouped="false"></group-button>
        </div>
      </div>
    </div>
  `
})

var ContactDetailExtnoLink = Vue.component('extno-link', {
  props: {
    extno: {
      type: String,
      required: false
    }
  },
  methods: {
    getAllExt: function () {
      var exts = this.extno;
      if (this.isMultipleExt()) {
        exts = this.seperateExt();
      }
      exts = this.removeDuplicate(exts);
      return exts;
    },
    isMultipleExt: function () {
      if (this.extno.indexOf(",") > -1) {
        return true;
      } else {
        return false;
      }
    },
    seperateExt: function () {
      var exts = this.extno.split(",");
      return exts.filter(e => {
        return e.trim() !== "";
      });
    },
    removeDuplicate: function (exts) {
      if (Array.isArray(exts)) {
        return exts.map(function (ext) {
          return (ext.indexOf("(") > -1) ? ext.substring(0, ext.indexOf("(")) : ext;
        });
      } else {
        return (exts.indexOf("(") > -1) ? exts.substring(0, exts.indexOf("(")) : exts;
      }
    }
  },
  template: `
    <div v-if="isMultipleExt()">
        <a v-for="ext in getAllExt()" :key="ext"
        @click="$emit('update-latest', 'ext')" :href="'tel:' + ext">
        {{ ext }}
        </a>
    </div>
    <div v-else>
        <a @click="$emit('update-latest', 'ext')"
        :href="'tel:' + removeDuplicate(this.extno)">
        {{ removeDuplicate(this.extno) }}
        </a>
    </div>
    `
})

var ContactDetailGroupButton = Vue.component('group-button', {
  props: {
    contact: {
      type: Object,
      required: true
    },
    groups: {
      type: Array,
      required: false
    },
    isGrouped: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  data: function () {
    return {
      newingGroup: false
    }
  },
  computed: {
    otherGroups: function () {
      return this.groups.filter((group) => {
        return group.groupId != this.contact.GroupId;
      })
    }
  },
  methods: {
    getGroupName: function (groupId) {
      var group = app.groups.find(function (e) {
        return e.groupId === groupId;
      })
      if (group) return group.name;
    },
    addGroup: function (groupId) {
      this.contact.GroupId = groupId;
      this.contact.UpdateTime = new Date();
      var request = db.transaction(["contacts"], "readwrite")
        .objectStore("contacts")
        .put(this.contact);
      request.onsuccess = function (event) {
        app.getContactsSaved();
      };
    },
    newGroup: function () {
      let groupName = document.getElementById("groupName").value;
      if (!groupName) {
        alert("請輸入內容");
        return;
      }
      let newId = (this.groups.length > 0) ? this.groups[this.groups.length - 1].groupId + 1 : 1;
      let newGroup = { groupId: newId, name: groupName };
      var request = db.transaction(["groups"], "readwrite")
        .objectStore("groups")
        .put(newGroup);
      request.onsuccess = (event) => {
        app.getGroups();
        this.addGroup(newId);
      };
      this.newingGroup = false;
      document.getElementById("groupName").value = "";
    },
    cancelGroup: function (groupId) {
      this.contact.GroupId = null;
      this.contact.UpdateTime = new Date();
      var request = db.transaction(["contacts"], "readwrite")
        .objectStore("contacts")
        .put(this.contact);
      request.onsuccess = function (event) {
        app.getContactsSaved();
      };
    }
  },
  template: `
    <div>
      <!-- Button trigger modal -->
      <button v-if="isGrouped" class="btn btn-success" type="button" id="addGroupButton" data-toggle="modal" data-target="#groupModal">
        <i class="fas fa-check"></i> {{ getGroupName(contact.GroupId) }}
      </button>
      <button v-else class="btn btn-outline-secondary" type="button" id="addGroupButton" data-toggle="modal" data-target="#groupModal">
        <i class="fas fa-users"></i> 加入群組
      </button>
      <!-- Modal -->
      <div class="modal fade" id="groupModal" tabindex="-1" role="dialog" aria-labelledby="groupModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="groupModalLabel">群組 {{ getGroupName(contact.GroupId) }}</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="mx-4 my-3" v-show="groups.length > 1 || (groups.length == 1 && groups[0].groupId != contact.GroupId)">
              <button class="btn btn-outline-secondary mr-2 mt-2" v-for="group in otherGroups" :key="group.groupId" @click="addGroup(group.groupId)" data-dismiss="modal">加到 <b>{{ group.name }}</b></button>
            </div>
            <div class="mx-4 my-3">
              <p>新增群組</p>
              <div class="input-group mb-3">
                <input type="text" class="form-control" id="groupName" placeholder="請輸入群組名稱" autocomplete="off">
                <div class="input-group-append">
                  <button class="btn btn-outline-secondary" type="button" @click="newGroup()" data-dismiss="modal">新增</button>
                </div>
              </div>
            </div>
            <div class="mx-4 mb-4" v-show="isGrouped">
              <button class="btn btn-outline-secondary" v-show="isGrouped" @click="cancelGroup" data-dismiss="modal">自群組移除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})

var app = new Vue({
  el: '#app',
  data: {
    homeContentDefault: 'history',
    homeContent: 'history',
    savedContentDefault: 'saved',
    savedContent: 'saved',
    groupContentDefault: 'group',
    groupContent: 'group',
    editMode: false,
    includeWinbond: false,
    contact: {},
    contacts: [],
    contactsWinbond: [],
    contactsSaved: [],
    results: [],
    groups: [],
  },
  computed: {
    historyContacts: function () {
      return this.contactsSaved.filter(function (contact) {
        return contact.Latest;
      });
    },
    savedContacts: function () {
      return this.contactsSaved.filter(function (contact) {
        return contact.Saved;
      });
    }
  },
  mounted() {
    this.getContacts();
    history.pushState(this.homeContent, "", "#home");
  },
  methods: {
    getContacts: function () {
      var $this = this;
      var xmlhttp = new XMLHttpRequest();

      xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          var json = JSON.parse(this.responseText);
          getContactsData(json);
        }
      };
      xmlhttp.open("GET", CONTACTS_URL, true);
      xmlhttp.send();

      function getContactsData(json) {
        for (var i in json) {
          var contact = json[i];
          contact.Saved = false;
          contact.GroupId = null;
          contact.Winbond = false;
          contact.Latest = null;
          contact.UpdateTime = new Date();
          $this.contacts.push(contact);
        }
      }
    },
    getGroups: function () {
      var $this = this;
      if (db) {
        var transaction = db.transaction("groups", 'readonly');
        var objectStore = transaction.objectStore("groups");

        if ('getAll' in objectStore) {
          objectStore.getAll().onsuccess = function (event) {
            $this.groups = event.target.result;
          };
        } else {
          var groupsArray = [];
          objectStore.openCursor().onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
              groupsArray.push(cursor.value);
              cursor.continue();
            } else {
              $this.groups = groupsArray;
            }
          };
        }
      }
    },
    getContactsSaved: function () {
      if (db) {
        var transaction = db.transaction("contacts", 'readonly');
        var objectStore = transaction.objectStore("contacts");
        var index = objectStore.index('UpdateTime');
        var cursorRequest = index.openCursor(null, "prev");
        var contactsToSaved = [];
        cursorRequest.onsuccess = (event) => {
          var cursor = event.target.result;
          if (cursor) {
            contactsToSaved.push(cursor.value);
            cursor.continue();
          } else {
            this.contactsSaved = contactsToSaved;
            // saveData();
          }
        };
      }
    },
    getContactsByGroup: function (groupId) {
      var contacts = this.contactsSaved.filter(function (contact) {
        return contact.GroupId === groupId;
      });
      return contacts;
    },
    updateContactFromDB: function (contact) {
      if (!contact) return;
      var newContact = contact;
      this.contactsSaved.forEach(element => {
        if (element.EmployeeID === contact.EmployeeID) {
          newContact = element;
        }
      });
      return newContact;
    },
    updateLatest: function (latestAction) {
      this.contact.Latest = latestAction;
      this.contact.UpdateTime = new Date();

      var request = db.transaction(["contacts"], "readwrite")
        .objectStore("contacts")
        .put(this.contact);
      request.onsuccess = function (event) {
        app.getContactsSaved();
      };
    },
    clickHomeMenu: function () {
      this.homeContent = this.homeContentDefault;
      this.handlePushState(this.homeContent, "#home");
      this.resetContent();
    },
    clickSaveMenu: function () {
      this.savedContent = this.savedContentDefault;
      this.handlePushState(this.savedContent, "#save");
      this.resetContent();
    },
    clickGroupMenu: function () {
      this.groupContent = this.groupContentDefault;
      this.handlePushState(this.groupContent, "#group");
      this.resetContent();
    },
    clickHomeHistoryPreview: function () {
      this.homeContent = this.homeContentDefault;
      this.handlePushState(this.homeContent, "#home");
    },
    clickHomeContact: function (contact) {
      this.contact = contact;
      this.homeContent = 'detail';
      this.handlePushState(this.homeContent, "#home-detail");
    },
    clickSaveContact: function (contact) {
      this.contact = contact;
      this.savedContent = 'detail';
      this.handlePushState(this.savedContent, "#save-detail");
    },
    clickGroupContact: function (contact) {
      this.contact = contact;
      this.groupContent = 'detail';
      this.handlePushState(this.groupContent, "#group-detail");
    },
    //clickIncludeWinbond: function () {
    //    document.getElementById("searchInput").focus();
    //    this.$refs.mainSearch.setResults();
    //},
    resetContent: function () {
      this.$refs.mainSearch.search = "";
      setTimeout(() => {
        this.homeContent = this.homeContentDefault;
        this.savedContent = this.savedContentDefault;
        this.groupContent = this.groupContentDefault;
        this.editMode = false;
      }, 200);
    },
    handlePushState: function (state, url) {
      if (history.state == state) return;
      history.pushState(state, "", url);
    },
    deleteGroup: function (groupId) {
      var r = confirm("移除群組將連同聯絡資訊一併移除，是否繼續?");
      if (r) {
        var request = db.transaction(["groups"], "readwrite")
          .objectStore("groups")
          .delete(groupId);
        request.onsuccess = (event) => {
          app.getGroups();
        };
        var objectStore = db.transaction("contacts", "readwrite").objectStore("contacts");
        objectStore.openCursor().onsuccess = (event) => {
          var cursor = event.target.result;
          if (cursor) {
            if (cursor.value.GroupId === groupId) {
              const updateData = cursor.value;

              updateData.GroupId = null;
              const request = cursor.update(updateData);
              request.onsuccess = function () {
                app.getContactsSaved();
              };
            }
            cursor.continue();
          }
        };
        this.editMode = false;
      }
    },
    editGroup: function (groupId) {
      var newName = prompt("請輸入新的名稱");
      if (newName != null) {
        let editGroup = { groupId: groupId, name: newName };
        var request = db.transaction(["groups"], "readwrite")
          .objectStore("groups")
          .put(editGroup);
        request.onsuccess = (event) => {
          app.getGroups();
        };

        this.editMode = false;
      } else if (newName == "") {
        alert("請輸入內容");
      }
    },
    removeHistory: function () {
      var objectStore = db.transaction("contacts", "readwrite").objectStore("contacts");
      objectStore.openCursor().onsuccess = (event) => {
        var cursor = event.target.result;
        if (cursor) {
          if (cursor.value.Latest) {
            const updateData = cursor.value;
            updateData.Latest = null;
            const request = cursor.update(updateData);
            request.onsuccess = function () {
              app.getContactsSaved();
            };
          }
          cursor.continue();
        }
      };
    },
    scrollTop: function () {
      window.scrollTo(0, 0);
    }
  }
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(function (registration) {

    })
    .catch(function (err) {
      console.error('Service Worker registration failed: ', err);
    });
}