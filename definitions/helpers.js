F.helpers.pagination = function(model) {
	var pagination = new Pagination(model.count, model.page, model.limit, this.href('page', 'XyX').replace('XyX', '{0}'));
	return '{0}{1}{2}'.format(pagination.isPrev ? pagination.prev().html(`<li class="page-item disabled">
	<span class="page-link">Previous</span>
</li>`, 'control') : '', pagination.html(6), pagination.isNext ? pagination.next().html(`<li class="page-item">
<a class="page-link" href="#">Next</a>
</li>`, 'control') : '');
};