var Vue = window.Vue
var VueRouter = window.VueRouter
var firebase = window.firebase
var paper = window.paper

var firebaseConfig = {
  apiKey: 'AIzaSyDV8Dm_puLyulsAUCmkLQgWf_L9GIQ1A_s',
  authDomain: 'kapit-f853c.firebaseapp.com',
  databaseURL: 'https://kapit-f853c.firebaseio.com',
  storageBucket: 'kapit-f853c.appspot.com',
  messagingSenderId: '29870477641'
}
firebase.initializeApp(firebaseConfig)
var database = firebase.database()
var storage = firebase.storage()

var gyms = [
  { id: 'ts', name: 'Power Up TS' },
  { id: 'centro', name: 'Power Up Centro' },
  { id: 'rox', name: 'Power Up ROX' },
  { id: 'ccm', name: 'Climb Central Manila' }
]

var gradings = {
  freeClimb: [
    {
      id: 'yds',
      name: 'YDS',
      grades: [ '3-4', '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a', '5.15b', '5.15c' ]
    },
    {
      id: 'french',
      name: 'French',
      grades: [ '1', '2', '3', '4a', '4b', '4c', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a', '9a+', '9b', '9b+' ]
    }
  ],
  bouldering: [
    {
      id: 'hueco',
      name: 'Hueco',
      grades: [ 'VB', 'V0-', 'V0', 'V0+', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17' ]
    },
    {
      id: 'font',
      name: 'Font',
      grades: [ '3', '4-', '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+', '9A' ]
    }
  ]
}

var Index = {
  template: '#index',
  props: ['user'],
  firebase: {
    _routes: database.ref('routes')
      .orderByChild('submittedAt')
      .limitToLast(50)
  },
  computed: {
    routes: function () {
      return this._routes.slice().reverse()
    }
  }
}

Vue.component('paper', {
  template: '<canvas></canvas>',
  props: ['url'],
  mounted: function () {
    paper.setup(this.$el)

    var raster = new paper.Raster({
      crossOrigin: 'anonymous',
      source: this.url,
      position: paper.view.center
    })
    raster.onLoad = function () {
      paper.view.viewSize.width = 480
      paper.view.viewSize.height = 480 * raster.height / raster.width
      raster.fitBounds(paper.view.bounds)
    }

    var tool = new paper.Tool()
    var path

    tool.onMouseDown = function (e) {
      path = new paper.Path()
      path.strokeColor = 'black'
      path.strokeWidth = 3
    }

    tool.onMouseDrag = function (e) {
      if (path.segments.length > 1) {
        path.lastSegment.point.x = e.point.x
        path.lastSegment.point.y = e.point.y
      } else {
        path.add(e.point)
      }
    }

    tool.onMouseUp = function (e) {
      if (path.segments.length < 2) {
        return
      }
      var arrow = new paper.Path.RegularPolygon(e.point, 3, 9)
      arrow.fillColor = 'black'
      var vector = path.lastSegment.point.subtract(path.firstSegment.point)
      arrow.rotate(vector.angle + 90)
    }
  }
})

var Submit = {
  template: '#submit',
  props: ['user'],
  data: function () {
    return {
      step: 'selectRouteType',
      routeKey: null,
      routeGym: null,
      routeType: null,
      routeGrading: null,
      routeGrade: null,
      routePhoto: null,
      routePhotoUploading: false,
      routePhotoProgress: 0,
      routeSetter: null,
      routeName: null,
      routeDescription: null
    }
  },
  computed: {
    allowNext: function () {
      switch (this.step) {
        case 'selectRouteType':
          return this.routeGym &&
            this.routeType &&
            !this.routePhotoUploading
        case 'editPhoto':
          return this.routePhoto
        case 'submitRoute':
          return this.routeSetter && this.routeSetter.length
        default:
          return false
      }
    },
    gymChoices: function () {
      return gyms
    },
    climbType: function () {
      return this.routeType === 'boulder'
        ? 'bouldering'
        : 'freeClimb'
    },
    gradingChoices: function () {
      if (this.routeType) {
        return gradings[this.climbType]
      }
    },
    gradeChoices: function () {
      if (this.routeGrading) {
        var routeGrading = this.routeGrading
        return gradings[this.climbType].reduce(function (grades, grading) {
          if (grading.id === routeGrading) {
            return grading.grades
          }
          return grades
        }, [])
      }
    }
  },
  methods: {
    uploadPhoto: function (e) {
      this.routeKey = database.ref('routes/' + this.user.uid).push().key
      var file = e.target.files[0]
      var routeImages = storage.ref('routeImages/' + file.name)
      var uploadTask = routeImages.put(file)
      uploadTask.on(
        firebase.storage.TaskEvent.STATE_CHANGED,
        this.setPhotoProgress,
        function (error) {
          console.error(error)
        },
        this.setPhoto.bind(this, 'submitRoute', uploadTask))
      this.routePhotoUploading = true
    },
    setPhotoProgress: function (snapshot) {
      this.routePhotoProgress = Math.ceil(snapshot.bytesTransferred / snapshot.totalBytes * 100)
    },
    setPhoto: function (nextStep, uploadTask) {
      this.routePhotoProgress = 100
      this.routePhotoUploading = false
      this.routePhoto = uploadTask.snapshot.downloadURL
      this.step = nextStep
    },
    savePhoto: function () {
      // NOTE: Skipped until markings get better
      // TODO: Check if there were changes made to avoid re-uploading
      this.$refs.canvas.$el.toBlob(this.uploadCanvas)
    },
    uploadCanvas: function (blob) {
      var editedImages = storage.ref('editedImages/' + this.routeKey + '.png')
      var uploadTask = editedImages.put(blob)
      uploadTask.on(
        firebase.storage.TaskEvent.STATE_CHANGED,
        function (snapshot) {
          console.log('progress', snapshot.bytesTransferred / snapshot.totalBytes * 100)
        },
        function (error) {
          console.error(error)
        },
        this.setPhoto.bind(this, 'submitRoute', uploadTask))
    },
    submitRoute: function () {
      var routeData = {
        gym: this.routeGym,
        type: this.routeType,
        grading: this.routeGrading,
        grade: this.routeGrade,
        photo: this.routePhoto,
        setter: this.routeSetter,
        name: this.routeName,
        description: this.routeDescription,
        submittedAt: firebase.database.ServerValue.TIMESTAMP,
        submittedBy: {
          uid: this.user.uid,
          displayName: this.user.displayName,
          photoURL: this.user.photoURL
        }
      }
      var updates = {}
      updates['userRoutes/' + this.user.uid + '/' + this.routeKey] = routeData
      updates['routes/' + this.routeKey] = routeData
      database.ref().update(updates).then(this.gotoRoute)
    },
    gotoRoute: function () {
      this.$router.push('routes/' + this.routeKey)
    }
  }
}

var Route = {
  template: '#route',
  props: ['user'],
  created: function () {
    this.$bindAsObject('route', database.ref('routes/' + this.$route.params.key))
  },
  computed: {
    gymName: function () {
      var id = this.route.gym
      return gyms.filter(function (gym) {
        return gym.id === id
      })[0].name
    }
  }
}

function initApp () {
  var routes = [
    { path: '/', component: Index },
    { path: '/submit', component: Submit },
    { path: '/routes/:key', component: Route }
  ]
  var router = new VueRouter({ mode: 'history', routes: routes })

  var app = new Vue({
    router: router,
    data: { user: null },
    methods: {
      login: function () {
        var provider = new firebase.auth.FacebookAuthProvider()
        firebase.auth().signInWithPopup(provider)
      },
      logout: function (e) {
        e.preventDefault()
        firebase.auth().signOut()
      }
    }
  }).$mount('#app')

  firebase.auth().onAuthStateChanged(function (user) {
    app.user = user
  })
}

window.onload = initApp
