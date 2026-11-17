Pod::Spec.new do |s|
  s.name           = 'LumaAudioEngine'
  s.version        = '0.1.0'
  s.summary        = 'Native cross-platform playback transport for LumaMusic.'
  s.description    = 'Expo native module providing AVPlayer transport and playback state events.'
  s.license        = { :type => 'Proprietary', :text => 'Copyright (c) 2026 PauzeX Developments. All rights reserved.' }
  s.author         = 'PauzeX Developments'
  s.homepage       = 'https://github.com/PauzeDevs/LumaMusic'
  s.source         = { :git => 'https://github.com/PauzeDevs/LumaMusic.git', :branch => 'master' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.static_framework = true
  s.source_files   = 'ios/**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
