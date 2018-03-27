/**
 * 用户表接口controller
 * @author karl.luo<luolinjia@cmiot.chinamobile.com>
 */
'use strict'

var xss = require('xss')
var mongoose = require('mongoose')
var bcrypt = require('bcryptjs')
var User = mongoose.model('User')
var jsonwebtoken = require('jsonwebtoken')
import userHelper from '../dbhelper/userHelper'
import teamHelper from '../dbhelper/teamHelper'
import projectHelper from '../dbhelper/projectHelper'
import {secret} from '../../config/index'

/**
 * 登录逻辑
 * @param {[type]}   ctx   [description]
 * @param {Function} next  [description]
 * @yield {[type]}         [description]
 */
exports.login = async(ctx, next) => {
	var userName = xss(ctx.request.body.username);
	var password = xss(ctx.request.body.password);

	if (userName === '' || password === '') {
		ctx.status = 200;
		ctx.body = {
			code: -1,
			message: '用户名或密码不能为空!'
		};
		return;
	}

	var user = await userHelper.findUser(userName);
	if(!user) {
		ctx.status = 401;
		ctx.body = {
			code: -1,
			message: '根本就没这个人'
		};
		return;
	} 

	if (user.status && user.status === 1) {
		ctx.status = 401;
		ctx.body = {
			code: -1,
			message: '此人已离职'
		};
		return;
	}
	
	if (user.status === null || user.status === undefined) {
		await userHelper.addStatus4User(user._id);
	}

	if (user.password === '111' || user.password === 'asdf') {
		// 如果用户的密码是111，说明是v1.0.0版本的用户，此时要用salt重新加一次密，并存入salt
		var prevSalt = bcrypt.genSaltSync(10);
		var prevPassword = bcrypt.hashSync(user.password, prevSalt);
		user = await userHelper.updatePrevPassword({user: user, salt: prevSalt, password: prevPassword});
	}

	var salt = user.salt;
	var hashPassword = bcrypt.hashSync(password, salt);
	if (user.password === hashPassword) {
		// username and password are correct
		var teamInfo = {};
		if (user.role === -1) {
			teamInfo.name = '总监';
			// var projects = await projectHelper.initOldVersionProject(user);
		} else {
			teamInfo = await teamHelper.findTeam(user.team);
		}
		var userInfo = {
			_id: user._id,
			parent_id: user.parent,
			name: user.name,
			role: user.role,
			team: user.team,
			teamName: teamInfo.name
		};
		
		ctx.status = 200;
		ctx.body = {
			code: 0,
			data: {
				user: userInfo,
				token: jsonwebtoken.sign({
					data: userInfo,
					exp: Math.floor(Date.now() / 1000) + (60 * 60 * 15) // 60 seconds * 60 minutes * 3 = 3 hour
				}, secret)
			},
			message: '登录成功!'
		};
	} else {
		// password is wrong
		ctx.status = 500;
		ctx.body = {
			code: 500,
			data: [],
			message: '密码都记不住了吗?'
		};
	}

};

/**
 * 新增用户
 * @param {[type]}   ctx   [description]
 * @param {Function} next  [description]
 * @yield {[type]}         [description]
 */
exports.addUser = async(ctx, next) => {
	var userName = xss(ctx.request.body.name);
	var password = xss(ctx.request.body.password);
	var project = xss(ctx.request.body.project);
	var parent = xss(ctx.request.body.parent);
	var role = xss(ctx.request.body.role);
	var team = xss(ctx.request.body.team);

	var userObj = team === undefined ? {
		_id: new mongoose.Types.ObjectId(),
		name: userName,
		password: password,
		role: role,
		parent: parent
	} : {
		_id: new mongoose.Types.ObjectId(),
		name: userName,
		password: password,
		role: role,
		parent: parent,
		team: team
	};

	var user = new User(userObj);
	var user2 = await userHelper.addUser(user);
	if (user2) {
		ctx.status = 200;
		ctx.body = {
			code: 0,
			data: data,
			message: '新增成功'
		}
	}
}

/**
 * 修改密码
 * @param {[type]}   ctx   [description]
 * @param {Function} next  [description]
 * @yield {[type]}         [description]
 */
exports.changePassword = async(ctx, next) => {
	var userId = xss(ctx.request.body.userId);
	var password = xss(ctx.request.body.password);
	var oldPassword = xss(ctx.request.body.oldPassword);
	var user = await userHelper.findUserById({id:userId});
	var salt = user.salt;

	var oldHashPassword = bcrypt.hashSync(oldPassword, salt);

	if (oldHashPassword !== user.password) {
		ctx.status = 500;
		ctx.body = {
			code: 0,
			data: [],
			message: '原密码对不上，不能修改！'
		};
		return;
	}

	var hashPassword = bcrypt.hashSync(password, salt);
	var passUser = await userHelper.changePassword({userId: userId, password: hashPassword});
	if (passUser) {
		ctx.status = 200;
		ctx.body = {
			code: 0,
			data: passUser,
			message: '密码已修改'
		}
	}
};