/**
 * 任务表数据库CRUD
 * @author karl.luo<luolinjia@cmiot.chinamobile.com>
 */
'use strict';

var mongoose =  require('mongoose');
var Task = mongoose.model('Task');
var User = mongoose.model('User');

/**
 * 查找所有task
 * @return {[type]} [description]
 */
const findAllTasks = async () => {
	var query = Task.find({});
	var res = [];
	await query.exec(function(err, tasks) {
		if (err) {
			res = [];
		} else {
			res = tasks;
		}
	});
	return res;
};

/**
 * 根据ID查找task
 * @return {[type]} [description]
 */
const findTaskById = async (id) => {
	var query = Task.find({_id: id});
	var res = [];
	await query.exec(function(err, tasks) {
		if (err) {
			res = [];
		} else {
			res = tasks;
		}
	});
	return res;
};

/**
 * 通过period,status,user查询上一期未完成的任务
 * @param params
 * @returns {Array}
 */
const checkUnfinishTask = async (params) => {
	var query = Task.find({period: parseInt(params.period) - 1, status: {$ne: 2}, user: params.userId});
	var res = [];
	await query.exec((err, tasks) => {
		if (err) {
			res = [];
		} else {
			res = tasks;
		}
	});
	return res;
};

/**
 * 通过period,status,user查询本期已经存在的未完成任务
 * @param params
 * @returns {Array}
 */
const isExistTask = async (params) => {
	var query = Task.find({name: params.name, period: params.period, user: params.userId});
	var res = [];
	await query.exec((err, tasks) => {
		if (err) {
			res = [];
		} else {
			res = tasks;
		}
	});
	return res;
};

/**
 * 查找相关task,根据用户的角色不一样进行对应的查找
 * @return {[type]} [description]
 */
const findTaskByPeriod = async (params) => {
	var query, queryInner, ausers = [], res = [], uRole = parseInt(params.userRole);

	// role = -1是super管理员的情况, 应该不会进入这种情况
	if (uRole === -1) {
		// query = Task.find({"period": params.period});
		// await query.populate('user', 'name').populate('project').exec(function(err, tasks) {
		// 	if(err) {
		// 		res = [];
		// 	} else {
		// 		res = tasks;
		// 	}
		// });
	} else if (uRole === 0) {//role = 0 是team管理员的情况,根据team
		query = User.find({"team": params.team_id});
		// 查出用户数组,方便查询相关任务
		await query.exec((err, users) => {
			if (err) { res = []; }
			else {
				ausers = users;
			}
		});

		queryInner = Task.find({user:{$in:ausers}, period: params.period});
		await queryInner.populate('user', 'name').populate('project').exec((err2, tasks) => {
			if (err2) {res = []}
			else {
				res = tasks;
			}
		});
	} else {
		if (uRole === 1) { //如果是小组长,就通过parent来查找
			query = User.find({"parent": params.userId});
		} else { //如果是本人,就匹配名字
			query = User.find({"name": params.userName});
		}
		// 查出用户数组,方便查询相关任务
		await query.exec((err, users) => {
			if (err) { res = []; }
			else {
				ausers = users;
			}
		});
		//根据用户数组,可以分用户角色查询出不同的task列表,如果是小组长,查询出来的是他本人和他下面的组员所有信息
		//如果是本人,就$in里面只有自己的信息,查询出来自己的相关列表
		queryInner = Task.find({user:{$in:ausers}, period: params.period});
		await queryInner.populate('user', 'name').populate('project').exec((err2, tasks) => {
			if (err2) {res = []}
			else {
				res = tasks;
			}
		});
	}
	return res;
};

/**
 * 增加task
 * @param  {[Task]} task [mongoose.model('Task')]
 * @return {[type]}      [description]
 */
const addTask = async (task) => {
	task = await task.save();
	return task;
};

/**
 * 编辑task
 * @param  {[Task]} task [mongoose.model('Task')]
 * @return {[type]}      [description]
 */
const editTask = async (params) => {
	var query = Task.findByIdAndUpdate(params.id, {
		name:params.name,
		project:params.project,
		progress:params.progress,
		status:params.status,
		remark:params.remark,
		update_at:params.update_at,
	});
	var res = [];
	await query.exec((err, task) => {
		if (err) {
			res = [];
		} else {
			res = task;
		}
	});
	return res;
};

/**
 * 删除task
 * @param  {[Task]} task [mongoose.model('Task')]
 * @return {[type]}      [description]
 */
const delTask = async (id) => {
	var query = Task.remove({_id: id});
	var res = undefined;
	await query.exec((err, task) => {
		if (err) {
			res = err;
		} else {
			res = 'success';
		}
	});
	return res;
};


module.exports = {
	findAllTasks,
	findTaskById,
	findTaskByPeriod,
	isExistTask,
	checkUnfinishTask,
	addTask,
	editTask,
	delTask
};
