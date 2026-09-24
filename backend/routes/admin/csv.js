const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { auditLog } = require('../../middleware/rbac');

const router = Router();

// ═══════════════════════════════════════════════
// CSV HELPERS
// ═══════════════════════════════════════════════

function csvQ(v) {
  var s = String(v == null ? '' : v);
  if (s.indexOf('"') >= 0 || s.indexOf(',') >= 0 || s.indexOf('\n') >= 0) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function csvRow(arr) { return arr.map(csvQ).join(',') + '\n'; }

function parseCsvLine(line) {
  var result = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// Helper: extract audit context from request
function auditCtx(req) {
  return { staffId: req.user?.staffId || null, customerId: req.user?.id || null, ipAddress: req.ip || null };
}

// Helper: non-blocking audit write
function logAudit(req, action, module, targetId, details) {
  auditLog({ ...auditCtx(req), action, module, targetId: targetId || null, details: details ? JSON.stringify(details) : null }).catch(() => {});
}

// ═══════════════════════════════════════════════
// CSV EXPORTS — data export
// ═══════════════════════════════════════════════

router.get('/products/export', async (req, res) => {
  try {
    var ps = await prisma.product.findMany({include:{localizations:true,category:{include:{localizations:true}},brand:{include:{localizations:true}}},orderBy:{sortOrder:'asc'}});
    var csv = csvRow(['SKU','Slug','Name(LO)','Name(EN)','Category','Brand','Price','Stock','Status','Origin','Warranty']);
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var nlo = (p.localizations.find(function(l){return l.locale==='lo'})||{}).name||'';
      var nen = (p.localizations.find(function(l){return l.locale==='en'})||{}).name||'';
      var cat = (p.category&&p.category.localizations?(p.category.localizations.find(function(l){return l.locale==='lo'})||{}).name||p.category.slug:'')||'';
      var br = (p.brand&&p.brand.localizations?(p.brand.localizations.find(function(l){return l.locale==='lo'})||{}).name||p.brand.slug:'')||'';
      csv += csvRow([p.sku,p.slug,nlo,nen,cat,br,p.price||0,p.stock,p.status,p.origin||'',p.warranty||'']);
    }
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename=products.csv');
    res.send(csv);
  } catch(e) { res.status(500).json({error:'Failed to export products'}); }
});

router.get('/customers/export', async (req, res) => {
  try {
    var cs = await prisma.customer.findMany({orderBy:{createdAt:'desc'}});
    var csv = csvRow(['ID','Name','Email','Phone','Company','Role','Level','Active','Points','Joined']);
    for (var i = 0; i < cs.length; i++) {
      var x = cs[i];
      csv += csvRow([x.id,x.name,x.email,x.phone||'',x.company||'',x.role,x.level,x.active?'active':'deactivated',x.pointsBalance,x.createdAt.toISOString().slice(0,10)]);
    }
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename=customers.csv');
    res.send(csv);
  } catch(e) { res.status(500).json({error:'Failed to export customers'}); }
});

router.get('/staff/export', async (req, res) => {
  try {
    var ss = await prisma.staff.findMany({include:{customer:true,position:true}});
    var csv = csvRow(['ID','Name','Email','Position','SuperAdmin','Active']);
    for (var i = 0; i < ss.length; i++) {
      var s = ss[i];
      csv += csvRow([s.id,s.customer.name,s.customer.email,s.position?s.position.name:'',s.isSuperAdmin,s.active]);
    }
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename=staff.csv');
    res.send(csv);
  } catch(e) { res.status(500).json({error:'Failed to export staff'}); }
});

router.get('/orders/export', async (req, res) => {
  try {
    var os = await prisma.order.findMany({include:{items:true,customer:true},orderBy:{createdAt:'desc'}});
    var csv = csvRow(['OrderNumber','Customer','Email','Company','Status','Subtotal','Discount','CreatedAt']);
    for (var i = 0; i < os.length; i++) {
      var o = os[i];
      var sub = o.items.reduce(function(s,it){return s+(it.unitPrice||0)*it.quantity},0);
      csv += csvRow([o.orderNumber,o.customer.name,o.customer.email,o.customer.company||'',o.status,sub,o.discountApplied||0,o.createdAt.toISOString().slice(0,10)]);
    }
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename=orders.csv');
    res.send(csv);
  } catch(e) { res.status(500).json({error:'Failed to export orders'}); }
});

router.get('/quotations/export', async (req, res) => {
  try {
    var qs = await prisma.quotation.findMany({include:{items:true,customer:true},orderBy:{createdAt:'desc'}});
    var csv = csvRow(['QTNumber','Customer','Email','Company','Status','QuotedAmount','CreatedAt']);
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      csv += csvRow([q.quotationNumber,q.customer.name,q.customer.email,q.customer.company||'',q.status,q.quotedAmount||0,q.createdAt.toISOString().slice(0,10)]);
    }
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename=quotations.csv');
    res.send(csv);
  } catch(e) { res.status(500).json({error:'Failed to export quotations'}); }
});

// ═══════════════════════════════════════════════
// CSV IMPORTS — data import
// ═══════════════════════════════════════════════

router.post('/products/import', async (req, res) => {
  try {
    var { rows, dry_run } = req.body;
    if (!rows || !Array.isArray(rows)) return res.status(400).json({error:'rows array required'});
    var results = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      try {
        if (!row.sku || !row.name_lo) { results.push({row:i+1,sku:row.sku||'?',status:'error',error:'sku and name_lo required'}); continue; }
        var slug = row.slug || row.sku.toLowerCase().replace(/[^a-z0-9]+/g,'-');
        var existing = await prisma.product.findUnique({where:{sku:row.sku}});
        if (existing) { results.push({row:i+1,sku:row.sku,status:'skip',error:'SKU exists'}); continue; }
        if (!dry_run) {
          var prod = await prisma.product.create({data:{
            sku:row.sku, slug:slug, categoryId:row.category_id?parseInt(row.category_id):1,
            price:row.price?parseInt(row.price):null, stock:row.stock?parseInt(row.stock):0,
            status:row.status||'active', origin:row.origin||null, warranty:row.warranty||null,
            localizations:{create:[{locale:'lo',name:row.name_lo,description:row.desc_lo||null},{locale:'en',name:row.name_en||row.name_lo,description:row.desc_en||null}]},
          }});
          results.push({row:i+1,sku:row.sku,status:'created',id:prod.id});
        } else {
          results.push({row:i+1,sku:row.sku,status:'preview',error:'Would create'});
        }
      } catch(e) { results.push({row:i+1,sku:row.sku||'?',status:'error',error:e.message}); }
    }
    var created = results.filter(function(r){return r.status==='created'}).length;
    var errors = results.filter(function(r){return r.status==='error'}).length;
    if (!dry_run) logAudit(req,'import','products',null,{count:created,total:rows.length});
    res.json({total:rows.length,created:created,errors:errors,preview:!!dry_run,details:results});
  } catch(e) { res.status(500).json({error:'Import failed'}); }
});

router.post('/customers/import', async (req, res) => {
  try {
    var { rows, dry_run } = req.body;
    if (!rows || !Array.isArray(rows)) return res.status(400).json({error:'rows array required'});
    var results = [];
    var bcrypt = require('bcryptjs');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      try {
        if (!row.email || !row.name) { results.push({row:i+1,email:row.email||'?',status:'error',error:'email and name required'}); continue; }
        var email = row.email.toLowerCase().trim();
        var existing = await prisma.customer.findUnique({where:{email:email}});
        if (existing) { results.push({row:i+1,email:email,status:'skip',error:'Email exists'}); continue; }
        if (!dry_run) {
          var pass = row.password || 'ChangeMe123!';
          var hash = await bcrypt.hash(pass, 10);
          await prisma.customer.create({data:{email:email,passwordHash:hash,name:row.name,phone:row.phone||null,company:row.company||null,level:row.level||'customer'}});
          results.push({row:i+1,email:email,status:'created'});
        } else {
          results.push({row:i+1,email:email,status:'preview',error:'Would create'});
        }
      } catch(e) { results.push({row:i+1,email:row.email||'?',status:'error',error:e.message}); }
    }
    var created = results.filter(function(r){return r.status==='created'}).length;
    var errors = results.filter(function(r){return r.status==='error'}).length;
    if (!dry_run) logAudit(req,'import','customers',null,{count:created,total:rows.length});
    res.json({total:rows.length,created:created,errors:errors,preview:!!dry_run,details:results});
  } catch(e) { res.status(500).json({error:'Import failed'}); }
});

router.post('/staff/import', async (req, res) => {
  try {
    var { rows, dry_run } = req.body;
    if (!rows || !Array.isArray(rows)) return res.status(400).json({error:'rows array required'});
    var results = [];
    var bcrypt = require('bcryptjs');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      try {
        if (!row.email || !row.name) { results.push({row:i+1,email:row.email||'?',status:'error',error:'email and name required'}); continue; }
        var email = row.email.toLowerCase().trim();
        var existing = await prisma.customer.findUnique({where:{email:email}});
        if (existing) { results.push({row:i+1,email:email,status:'skip',error:'Email exists'}); continue; }
        if (!dry_run) {
          var pass = row.password || 'StaffPass123!';
          var hash = await bcrypt.hash(pass, 10);
          var customer = await prisma.customer.create({data:{email:email,passwordHash:hash,name:row.name,phone:row.phone||null,company:row.company||null,role:'staff'}});
          var positionId = null;
          if (row.position) {
            var pos = await prisma.position.findUnique({where:{name:row.position}});
            if (pos) positionId = pos.id;
          }
          var staff = await prisma.staff.create({data:{customerId:customer.id,positionId:positionId,isSuperAdmin:row.isSuperAdmin==='true'||row.isSuperAdmin===true,permissions:row.permissions||'[]'}});
          await prisma.customer.update({where:{id:customer.id},data:{staffId:staff.id}});
          results.push({row:i+1,email:email,status:'created',staffId:staff.id});
        } else {
          results.push({row:i+1,email:email,status:'preview',error:'Would create staff'});
        }
      } catch(e) { results.push({row:i+1,email:row.email||'?',status:'error',error:e.message}); }
    }
    var created = results.filter(function(r){return r.status==='created'}).length;
    var errors = results.filter(function(r){return r.status==='error'}).length;
    if (!dry_run) logAudit(req,'import','staff',null,{count:created,total:rows.length});
    res.json({total:rows.length,created:created,errors:errors,preview:!!dry_run,details:results});
  } catch(e) { res.status(500).json({error:'Import failed'}); }
});

module.exports = router;
