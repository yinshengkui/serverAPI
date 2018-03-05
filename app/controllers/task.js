'use strict'

var moment = require('moment')
var xss = require('xss')
var mongoose = require('mongoose')
var Task = mongoose.model('Task')
var jsonwebtoken = require('jsonwebtoken')
import UserHelper from '../dbhelper/UserHelper'
import TaskHelper from '../dbhelper/TaskHelper'

moment().format();

/**
 * 数据库接口测试
 * @param  {[type]}   ctx  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
exports.getTaskList = async(ctx, next) => {
	var data = await TaskHelper.findAllTasks();
	ctx.body = {
		code: 0,
		data: data,
		message: '获取成功'
	}
}
exports.addTask = async(ctx, next) => {
	var TaskName = xss(ctx.request.body.name);
	var UserId = xss(ctx.request.body.user_id);
	var ProjectId = xss(ctx.request.body.project_id);
	var Progress = xss(ctx.request.body.progress);
	var Status = xss(ctx.request.body.status);
	var Remark = xss(ctx.request.body.remark);
	var task = new Task({
		name: TaskName,
		user: UserId,
		project: ProjectId,
		progress: Progress,
		status: Status,
		remark: Remark,
		period: moment().format('w'),
		create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
		update_at: moment().format("YYYY-MM-DD HH:mm:ss")
	});

	var task2 = await TaskHelper.addTask(task);
	if (task2) {
		ctx.body = {
			code: 0,
			data: task2,
			message: '保存成功'
		}
	}
}

exports.getTaskListByPeriod = async(ctx, next) => {
	var period = xss(ctx.request.body.period);
	var userId = xss(ctx.request.body.userid);
	var userName = xss(ctx.request.body.username);
	var userRole = xss(ctx.request.body.userrole);

	var params = {
		period: period,
		userId: userId,
		userName: userName,
		userRole: userRole
	};

	var data = await TaskHelper.findTaskByPeriod(params);
	// console.log('tasklistbyperiod => ', data);
	// 重新组装结构,使其能为前端服务
	var projects = [];
	var tempObj = {};
	var statusZh = {
		'0': '开发中',
		'1': '已提测',
		'2': '已上线'
	};

	// get the relevant projects
	for (var i = 0, size = data.length; i < size; i++) {
		if (!tempObj[data[i].project.name]) {
			var item = {
				project: data[i].project.name,
				selected: [],
				data: []
			};
			projects.push(item);
			tempObj[data[i].project.name] = 1;
		}
	}

	for (var m = 0, mSize = data.length; m < mSize; m++) {
		var mItem = data[m];
		for (var n = 0, nSize = projects.length; n < nSize; n++) {
			var nItem = projects[n];
			// console.log('mItem ', mItem);
			// console.log('nItem ', nItem);
			if (mItem.project.name === nItem.project) {
				nItem.data.push({
					id: mItem._id,
					name: mItem.name,
					user: mItem.user,
					username: mItem.user.name,
					project: mItem.project,
					progress: mItem.progress,
					progressPercent: mItem.progress + '%',
					status: mItem.status,
					statusZh: statusZh[mItem.status],
					remark: mItem.remark,
					period: mItem.period,
					create_at: mItem.create_at,
					update_at: mItem.update_at
				});
			}
		}
	}

	ctx.body = {
		code: 0,
		data: projects,
		message: '获取成功'
	}
}
exports.updateTaskById = async(ctx, next) => {
	var id = xss(ctx.request.body.id);
	var taskName = xss(ctx.request.body.name);
	var userId = xss(ctx.request.body.user_id);
	var projectId = xss(ctx.request.body.project_id);
	var progress = xss(ctx.request.body.progress);
	var status = xss(ctx.request.body.status);
	var remark = xss(ctx.request.body.remark);
	var params = {
		id: id,
		name: taskName,
		project: projectId,
		progress: progress,
		status: status,
		remark: remark,
		update_at: moment().format("YYYY-MM-DD HH:mm:ss")
	};

	var taskById = await TaskHelper.findTaskById(id);
	if (taskById[0].user.toString() !== userId) {
		ctx.status = 500;
		ctx.body = {
			code: -1,
			message: '不可以编辑其他人的任务'
		};
		return;
	}

	var data = await TaskHelper.editTask(params);
	// console.log('edit done  => ', data);
	if (data) {
		ctx.status = 200;
		ctx.body = {
			code: 0,
			data: data,
			message: '修改成功'
		};
	} else {
		ctx.status = 500;
		ctx.body = {
			code: -1,
			message: data
		};
	}
}