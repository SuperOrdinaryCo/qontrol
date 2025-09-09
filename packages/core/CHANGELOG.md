# Changelog

## [1.1.0](https://github.com/SuperOrdinaryCo/qontrol/compare/core-v1.0.0...core-v1.1.0) (2025-09-09)


### Features

* add autoDiscovery flag ([4c7b962](https://github.com/SuperOrdinaryCo/qontrol/commit/4c7b962895f860f07623a7723919a9697c3d4337))
* add bulk retry ([697cea1](https://github.com/SuperOrdinaryCo/qontrol/commit/697cea1a0249a7984fce87a7935fd896fb85a310))
* add custom job using the UI ([d76c2a8](https://github.com/SuperOrdinaryCo/qontrol/commit/d76c2a827b0896d2511e665871c06ea4af20369a))
* add job logs ([5d5d801](https://github.com/SuperOrdinaryCo/qontrol/commit/5d5d801ba738955d069b9b47829c565e94949be3))
* add prioritized state ([6f4ae9b](https://github.com/SuperOrdinaryCo/qontrol/commit/6f4ae9b7649caf7b1a712c1b86e3e9dce6d5f542))
* add queue state clean action ([2b1876b](https://github.com/SuperOrdinaryCo/qontrol/commit/2b1876b272fb74b38912c4729fe8e217dd67a506))
* add setting for job data preview delay ([b26f705](https://github.com/SuperOrdinaryCo/qontrol/commit/b26f705f42a86e112075c0482af8acaf17c99306))
* logger should be abstract ([a6f1f56](https://github.com/SuperOrdinaryCo/qontrol/commit/a6f1f5639a9e55c3863ad92c8702a109a6ae4359))
* packages more or less stable ([4dce7e0](https://github.com/SuperOrdinaryCo/qontrol/commit/4dce7e0f197cba5eeb2b10e45012a4d982f6e789))
* pause / resume queue ([6a9b296](https://github.com/SuperOrdinaryCo/qontrol/commit/6a9b2967c33fdd5557009c49e9bf5a7c080cb83b))
* search by job data ([573702f](https://github.com/SuperOrdinaryCo/qontrol/commit/573702fdd245a227b8c7ebd1524683e9d4b43beb))
* support =, !=, ~, !~ operators ([3ebf61f](https://github.com/SuperOrdinaryCo/qontrol/commit/3ebf61f85b0bcf77740ff2aa4b3a08b7c3526ed9))
* views redis info on UI ([20155d1](https://github.com/SuperOrdinaryCo/qontrol/commit/20155d1420184a0a3ded2175c7ee182dbb35f876))


### Bug Fixes

* always check the registered queue names when client send some queue ([6a531c4](https://github.com/SuperOrdinaryCo/qontrol/commit/6a531c4dc6cedaa2feb30d0ac875284e136e59e7))
* change types. clean ([73d3d93](https://github.com/SuperOrdinaryCo/qontrol/commit/73d3d9360e9e6b591b08a73208597d8d05b10299))
* client routes. clean up ([c887f94](https://github.com/SuperOrdinaryCo/qontrol/commit/c887f946e1f6fa3e207ec4402ea6c40062c9b0ef))
* export multiple jobs using streams ([2a4cdc1](https://github.com/SuperOrdinaryCo/qontrol/commit/2a4cdc1212021d1d4af30d61b45bffd469c257ab))
* fix attempts. audit deps ([dca95c2](https://github.com/SuperOrdinaryCo/qontrol/commit/dca95c2d8c0eaa0a56463613922b98fd9650862b))
* job promotion and discard ([a31660b](https://github.com/SuperOrdinaryCo/qontrol/commit/a31660b3eaff870a517845d493fd252e3d5cf881))
* job state and show time to handle for delayed jobs ([73b0f16](https://github.com/SuperOrdinaryCo/qontrol/commit/73b0f164d0449fa15707ee4c66268b82c91386fb))
* pagination. streams wip ([19cc9d4](https://github.com/SuperOrdinaryCo/qontrol/commit/19cc9d4334804ebc21282d170b5b0e14da7e676f))
* refresh counts of the queue using auto refresh ([85c39f1](https://github.com/SuperOrdinaryCo/qontrol/commit/85c39f10ed41e4aea28c9be901adf16ecce74e4c))
* replace queue discovery by non-blocking scan operation ([9edf8ec](https://github.com/SuperOrdinaryCo/qontrol/commit/9edf8ecbd9005154e64f3ed07571cb416d7be785))
* search streams ([66f88c6](https://github.com/SuperOrdinaryCo/qontrol/commit/66f88c6c6e1e9aa722cbf9731bcc0259b13f3f7b))
