const express = require('express');
const router = express.Router();
const template = require('../lib/template.js');
const auth = require("../lib/auth.js");
const db = require("../lib/db");
global.crypto = require('crypto')

module.exports = function (passport) {

  //로그인 페이지
  router.get("/login", (req, res) => {
    const fmsg = req.flash();
    console.log("fmsg : ", fmsg);
    let feedback = '';
    if (fmsg.error) {
      feedback = fmsg.error[0];
    }
    const title = 'WEB - login';
    const list = template.list(req.list);
    const html = template.HTML(title, list, `
            <div style="color:red">${feedback}</div>
            <form action="/auth/login_process" method="post">
              <p><input type="text" name="email" placeholder="email"></p>  
              <p><input type="password" name="password" placeholder="password"></p>                                 
              <p>
                <input type="submit" value="login">

              </p>
              <p>
              <a class="button google" style="padding: 8px; text-decoration: none; color: #fff;background: #a22f2f;border-radius: 50px;"
                       href="/auth/login/federated/google">Sign in with Google</a>
   
              <a class="button facebook" style="padding: 8px; text-decoration: none; color: #fff; background: #3f51b5;border-radius: 50px;"
              href="/auth/login/federated/facebook">Sign in with Facebook</a>
               </p>
            </form>
          `, '', auth.statusUI(req, res));
    res.send(html);
  });




  // 로그인 처리 - 1) 성공 및 실패 페이지 설정 및 flash 사용여부 설정하기
  router.post('/login_process', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true,
    successFlash: true
  }));



  //1.구글로그인 처리 - 로그인 버튼 클릭시
  router.get('/login/federated/google', passport.authenticate('google'));


  //2.구글로그인 처리 - 콜백 반환
  router.get('/oauth2/redirect/google', passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true,
    successFlash: true
  }));


  //1.페이스북그인 처리 - 로그인 버튼 클릭시
  router.get('/login/federated/facebook', passport.authenticate('facebook', { scope: 'email' }));


  //2.페이스북그인  처리 - 콜백 반환
  router.get('/oauth2/redirect/facebook', passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true,
    successFlash: true
  }));


  //로그 아웃 처리
  router.get('/logout', function (req, res, next) {
    req.logout(function (err) {
      if (err) { return next(err); }

      req.session.destroy(function (err) {
        res.redirect("/");
      })
    });
  });


  //회원가입페이지
  router.get('/signup', function (req, res, next) {
    const fmsg = req.flash();
    let feedback = '';
    console.log("회원 가입페이지 : ", fmsg);
    if (fmsg.error) {
      feedback = fmsg.error[0];
    }

    const title = 'WEB - login';
    const list = template.list(req.list);
    const html = template.HTML(title, list, `
      <div style="color:red">${feedback}</div>
           <h1>Sign up</h1>
      <form action="/auth/signup_process" method="post">
          <section>
              <label for="username">이름</label>
              <input id="username" name="username" type="text" placeholder="이름" required>
          </section>
         <section>
              <label for="email">이메일</label>
              <input id="email" name="email" type="email" placeholder="이메일" required>
          </section>          
          <section>
              <label for="password">비밀번호</label>
              <input id="password" name="password" type="password" autocomplete="new-password" placeholder="비밀번호" required>
          </section>
          <section>
              <label for="password">비밀번호확인</label>
              <input id="password" name="pw2" type="password" autocomplete="new-password" placeholder="비밀번호확인" required>
          </section>          
          <button type="submit">Sign up</button>
      </form>
          `, '', auth.statusUI(req, res));
    res.send(html);
  });

  //회원가입처리
  router.post('/signup_process', function (req, res, next) {
    if (req.body.password !== req.body.pw2) {
      req.flash("error", "비밀번호가 일치 하지 않습니다.");
      return res.redirect("/auth/signup");
    }
    crypto.randomBytes(16, (error, buf) => {
      const salt = buf.toString("base64");

      crypto.pbkdf2(req.body.password.trim(), salt, 310000, 32, 'sha256', function (err, hashedPassword) {
        console.log("회원가입 데이터 : ", req.body.password, salt, hashedPassword.toString('hex'));

        if (err) { return next(err); }
        db.query('INSERT INTO users (username,email, hashed_password, salt) VALUES (?, ?, ?, ?)', [
          req.body.username,
          req.body.email,
          hashedPassword.toString('hex'),
          salt
        ], function (err, results, fields) {

          if (err) {
           // req.flash("error", err.toString());
            req.flash("error", err.toString());
            return res.redirect('/auth/signup');
          }

          var user = {
            id: results.insertId,
            username: req.body.username
          };

          console.log("등록한 insertId :", results.insertId);

          req.login(user, function (err) {
            if (err) { return next(err); }
            req.flash("success", "회원가입을 축하합니다.");
            res.redirect('/');
          });


        });
      });


    });
  });

  return router;
}

