var http = require('../../../service/request.js'),
    dealErr = require('../../../util/err_deal.js'),
    util = require('../../../util/util.js'),
    app = getApp()
var playTimeInterval
var recordTimeInterval
var recordTimeout
var voiceTimeout
var updateInterval
var updateTimeout
Page({
  data: {
    li: 0,
    loop: false,    // 循环
    playing: false,
    currentTag: 'a',
    stop: false,
    playTime: '00:00:00',
    mao: 0,

    recording: false,
    recordPlaying: false,
    hasRecord: false,
    recordTime: 0,
    recordPlayTime: 0,
    formatedRecordTime: '00:00:00',
    formatedPlayTime: '00:00:00'
  },
  goHash (e) {
      let hash = e.currentTarget.dataset.hash
      console.log(hash)
      this.setData({
          mao: hash
      })
  },
  doubleClick: function (e) {
    var that = this
    //触摸时间距离页面打开时间毫秒数
    var curTime = e.timeStamp
    //上一次触摸距离页面打开时间毫秒数
    var lastTime = this.data.lastTapDiffTime
    console.log(e)
    if(lastTime > 0) {
      //如果两次单击间隔小于300毫秒，认为是双击
      if(curTime - lastTime < 300) {
        //双击
        if(that.data.currentTag == e.currentTarget.dataset.id) {
          that.setData({
            loop: false,
            currentTag: 'a'
          })
        } else {
          that.setData({
            loop: true,
            li: parseInt(e.currentTarget.dataset.id),
            currentTag: e.currentTarget.dataset.id
          })
          that.play()
          that.afterStop()
        }
      } else {
        console.log(e.timeStamp + '- tap')
      }
    } else {
      console.log(e.timeStamp + '- first tap')
    }

    this.setData({
      lastTapDiffTime: curTime
    })
  },
  play: function (res) {
    var that = this
    
    wx.playBackgroundAudio({
      dataUrl: that.data.arr[that.data.li].mp3,
      complete: function (res) {
        that.setData({
          playing: true
        })
        that._enableInterval()
      }
    })
    app.globalData.backgroundAudioPlaying = true
  },
  // seek: function (e) {
  //   clearInterval(this.updateInterval)
  //   var that = this
  //   wx.seekBackgroundAudio({
  //     position: e.detail.value,
  //     complete: function () {
  //       // 实际会延迟两秒左右才跳过去
  //       setTimeout(function () {
  //         that._enableInterval()
  //       }, 2000)
  //     }
  //   })
  // },
  pause: function () {
    var that = this
    wx.pauseBackgroundAudio({
      dataUrl: that.data.arr[that.data.li].mp3,
      success: function () {
        that.setData({
          playing: false
        })
      }
    })
    app.globalData.backgroundAudioPlaying = false
  },
  afterStop: function() {
    var that = this

    clearInterval(updateInterval)
    clearTimeout(updateTimeout)
    
    wx.onBackgroundAudioStop(function() {
      
      that.setData({
        playing: false,
        playTime: util.formatTime(0)
      })
      
      app.globalData.backgroundAudioPlaying = false
      
      //开始录音
      that.startRecord()
      //停止录音
      console.log(that.data.duration)
      recordTimeout = setTimeout(function() {
        that.stopRecord()
      }, that.data.duration*1000) 

      // if(that.data.li == that.data.max) {
      //   app.gloable.studyProgramOfLisen = that.data.num
      // } else if(that.data.stop) {
        
      // } else {
      //   that.updateTimeout = setTimeout(function(){
      //     that.play()
      //     that.afterStop()
      //   }, 2000)
      // }
        
    })
  },
  _enableInterval: function () {
    var that = this
    update()
    if(!that.data.stop) {
      updateInterval = setInterval(update, 500)
    } else {
      clearInterval(updateInterval)
    }
    function update() {
      wx.getBackgroundAudioPlayerState({
        success: function (res) {
          if(that.data.stop) {
            //已经退出页面，停止当前的播放
            that.setData({
              stop: true
            })
          }
          if(res.duration) {
            that.setData({
              duration: res.duration + 2
            })
          }
          if(that.data.playing) {
            that.setData({
              playTime: util.formatTime(res.currentPosition)
            })
          }
        }
      })
    }
  },
  getCourse: function() {
    var that = this
    var url = that.data.url + 'hh' + that.data.num + '.json',
        data = {}

    http._get(url, data,
      function(res) {
        dealErr.dealErr(res, function() {
          for(var x = 0; x < res.data.length; x++)
            res.data[x].index = x

          that.setData({
            arr: res.data,
            max: res.data.length
          })
          that.play()
          that.afterStop()
        })
      }, function(res) {
        dealErr.fail()
      })
  },
  startRecord: function () {
    this.setData({ recording: true })

    var that = this
    recordTimeInterval = setInterval(function () {
      var recordTime = that.data.recordTime += 1
      that.setData({
        formatedRecordTime: util.formatTime(that.data.recordTime),
        recordTime: recordTime
      })
    }, 1000)

    wx.startRecord({
      success: function (res) {
        console.log(res.tempFilePath)
        that.setData({
          hasRecord: true,
          formatedPlayTime: util.formatTime(that.data.recordPlayTime)
        })

        //播放录音
        that.playVoice(res.tempFilePath)

      },
      complete: function () {
        that.setData({ recording: false })
        clearInterval(recordTimeInterval)
      }
    })
  },
  stopRecord: function() {
    var that = this
    wx.stopRecord({
      success: function() {
        console.log('stop record success')
        clearInterval(recordTimeInterval)
        clearTimeout(recordTimeout)

        that.setData({
          recording: false,
          hasRecord: false,
          recordTime: 0,
          formatedRecordTime: util.formatTime(0)
        })
      }
    })
  },
  stopRecordUnexpectedly: function () {
    var that = this
    wx.stopRecord({
      success: function() {
        console.log('stop record success')
        clearInterval(recordTimeInterval)
        that.setData({
          recording: false,
          hasRecord: false,
          recordTime: 0,
          formatedRecordTime: util.formatTime(0)
        })
      }
    })
  },
  playVoice: function (tempFilePath) {
    var that = this
    that.setData({
      recordPlaying: true
    })

    playTimeInterval = setInterval(function () {
      var recordPlayTime = that.data.recordPlayTime + 1
      console.log('update recordPlayTime', recordPlayTime)
      that.setData({
        formatedPlayTime: util.formatTime(recordPlayTime),
        recordPlayTime: recordPlayTime
      })
    }, 1000)

    wx.playVoice({
      filePath: tempFilePath,
      success: function () {
        console.log('play voice success')
        voiceTimeout = setTimeout(function() {
          that.stopVoice()
        }, that.data.duration*1000)
      }
    })
  },
  pauseVoice: function () {
    clearInterval(playTimeInterval)
    wx.pauseVoice()
    this.setData({
      recordPlaying: false
    })
  },
  stopVoice: function () {
    var that = this
    clearInterval(playTimeInterval)
    clearTimeout(voiceTimeout)

    this.setData({
      recordPlaying: false,
      formatedPlayTime: util.formatTime(0),
      recordPlayTime: 0
    })
    wx.stopVoice()

    that.checkLoop()    
  },
  checkLoop: function() {
    var that = this
    if(!that.data.loop && !that.data.noce) {
      that.setData({
        li: that.data.li + 1
      })
    }

    if(that.data.li == that.data.max) {
      app.gloable.studyProgramOfRepeat = that.data.num
    } else if(that.data.stop) {
      
    } else {
      updateTimeout = setTimeout(function(){
        that.play()
        that.afterStop()
      }, 2000)
    }
  },
  clear: function () {
    clearInterval(playTimeInterval)
    wx.stopRecord()
    this.setData({
      recordPlaying: false,
      hasRecord: false,
      tempFilePath: '',
      formatedRecordTime: util.formatTime(0),
      recordTime: 0,
      recordPlayTime: 0
    })
  },
  onLoad:function(options){
    // 页面初始化 options为页面跳转所带来的参数
    var that = this

    wx.getSystemInfo( {
      success: ( res ) => {
        this.setData( {
          windowHeight: res.windowHeight - 140,
          windowWidth: res.windowWidth
        })
      }
    })

    that.audioCtx = wx.createAudioContext('myAudio')
    var api = app.globalData.APIUrl,
        url = app.globalData.url

    that.setData({
      api: api,
      url: url,
      num: options.index
    })

    that.getCourse()

    if (app.globalData.backgroundAudioPlaying) {
      this.setData({
        playing: true
      })
    }
  },
  onReady:function(){
    // 页面渲染完成
  },
  onShow:function(){
    // 页面显示
    this.setData({
      stop: false
    })
  },
  onHide:function(){
    // 页面隐藏
    if (this.data.playing) {
      this.stopVoice()
    } else if (this.data.recording) {
      this.stopRecordUnexpectedly()
    }

    this.setData({
      stop: true
    })
    clearTimeout(updateTimeout)
    clearInterval(updateInterval)
  },
  onUnload:function(){
    // 页面关闭
    if (this.data.playing) {
      this.stopVoice()
    } else if (this.data.recording) {
      this.stopRecordUnexpectedly()
    }

    this.setData({
      stop: true
    })
    clearTimeout(updateTimeout)
    clearInterval(updateInterval)
  }
})