import{_ as t,c as a,a0 as o,o as r}from"./chunks/framework.Dhp0bq1k.js";const f=JSON.parse('{"title":"Control","description":"","frontmatter":{},"headers":[],"relativePath":"api/classes/Control.md","filePath":"api/classes/Control.md"}'),d={name:"api/classes/Control.md"};function l(n,e,s,c,i,h){return r(),a("div",null,e[0]||(e[0]=[o('<h1 id="control" tabindex="-1">Control <a class="header-anchor" href="#control" aria-label="Permalink to &quot;Control&quot;">​</a></h1><h2 id="constructors" tabindex="-1">Constructors <a class="header-anchor" href="#constructors" aria-label="Permalink to &quot;Constructors&quot;">​</a></h2><h3 id="constructor" tabindex="-1">constructor <a class="header-anchor" href="#constructor" aria-label="Permalink to &quot;constructor&quot;">​</a></h3><p>• <strong>new Control</strong>(<code>ogma</code>, <code>options?</code>): <a href="./Control.html"><code>Control</code></a></p><h4 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>ogma</code></td><td style="text-align:left;"><code>Ogma</code>&lt;<code>any</code>, <code>any</code>&gt;</td></tr><tr><td style="text-align:left;"><code>options</code></td><td style="text-align:left;"><code>Partial</code>&lt;<a href="./../modules.html#controlleroptions"><code>ControllerOptions</code></a>&gt;</td></tr></tbody></table><h4 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><a href="./Control.html"><code>Control</code></a></p><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="prefixed" tabindex="-1">prefixed <a class="header-anchor" href="#prefixed" aria-label="Permalink to &quot;prefixed&quot;">​</a></h3><p>▪ <code>Static</code> <strong>prefixed</strong>: <code>string</code> | <code>boolean</code></p><h2 id="methods" tabindex="-1">Methods <a class="header-anchor" href="#methods" aria-label="Permalink to &quot;Methods&quot;">​</a></h2><h3 id="add" tabindex="-1">add <a class="header-anchor" href="#add" aria-label="Permalink to &quot;add&quot;">​</a></h3><p>▸ <strong>add</strong>(<code>annotation</code>): <code>this</code></p><p>Add an annotation to the controller</p><h4 id="parameters-1" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-1" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>annotation</code></td><td style="text-align:left;"><a href="./../modules.html#arrow"><code>Arrow</code></a> | <a href="./../modules.html#text"><code>Text</code></a> | <a href="./../interfaces/AnnotationCollection.html"><code>AnnotationCollection</code></a></td><td style="text-align:left;">The annotation to add</td></tr></tbody></table><h4 id="returns-1" tabindex="-1">Returns <a class="header-anchor" href="#returns-1" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="addlistener" tabindex="-1">addListener <a class="header-anchor" href="#addlistener" aria-label="Permalink to &quot;addListener&quot;">​</a></h3><p>▸ <strong>addListener</strong>&lt;<code>T</code>&gt;(<code>event</code>, <code>fn</code>, <code>context?</code>): <code>this</code></p><h4 id="type-parameters" tabindex="-1">Type parameters <a class="header-anchor" href="#type-parameters" aria-label="Permalink to &quot;Type parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>T</code></td><td style="text-align:left;">extends keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a></td></tr></tbody></table><h4 id="parameters-2" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-2" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event</code></td><td style="text-align:left;"><code>T</code></td></tr><tr><td style="text-align:left;"><code>fn</code></td><td style="text-align:left;">(...<code>args</code>: <code>ArgumentMap</code>&lt;<a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;[<code>Extract</code>&lt;<code>T</code>, keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;]) =&gt; <code>void</code></td></tr><tr><td style="text-align:left;"><code>context?</code></td><td style="text-align:left;"><code>any</code></td></tr></tbody></table><h4 id="returns-2" tabindex="-1">Returns <a class="header-anchor" href="#returns-2" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="canceldrawing" tabindex="-1">cancelDrawing <a class="header-anchor" href="#canceldrawing" aria-label="Permalink to &quot;cancelDrawing&quot;">​</a></h3><p>▸ <strong>cancelDrawing</strong>(): <code>void</code></p><p>Cancel drawing on the current frame</p><h4 id="returns-3" tabindex="-1">Returns <a class="header-anchor" href="#returns-3" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>void</code></p><h3 id="destroy" tabindex="-1">destroy <a class="header-anchor" href="#destroy" aria-label="Permalink to &quot;destroy&quot;">​</a></h3><p>▸ <strong>destroy</strong>(): <code>void</code></p><p>Destroy the controller and its elements</p><h4 id="returns-4" tabindex="-1">Returns <a class="header-anchor" href="#returns-4" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>void</code></p><h3 id="emit" tabindex="-1">emit <a class="header-anchor" href="#emit" aria-label="Permalink to &quot;emit&quot;">​</a></h3><p>▸ <strong>emit</strong>&lt;<code>T</code>&gt;(<code>event</code>, <code>...args</code>): <code>boolean</code></p><p>Calls each of the listeners registered for a given event.</p><h4 id="type-parameters-1" tabindex="-1">Type parameters <a class="header-anchor" href="#type-parameters-1" aria-label="Permalink to &quot;Type parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>T</code></td><td style="text-align:left;">extends keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a></td></tr></tbody></table><h4 id="parameters-3" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-3" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event</code></td><td style="text-align:left;"><code>T</code></td></tr><tr><td style="text-align:left;"><code>...args</code></td><td style="text-align:left;"><code>ArgumentMap</code>&lt;<a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;[<code>Extract</code>&lt;<code>T</code>, keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;]</td></tr></tbody></table><h4 id="returns-5" tabindex="-1">Returns <a class="header-anchor" href="#returns-5" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>boolean</code></p><h3 id="eventnames" tabindex="-1">eventNames <a class="header-anchor" href="#eventnames" aria-label="Permalink to &quot;eventNames&quot;">​</a></h3><p>▸ <strong>eventNames</strong>(): keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>[]</p><p>Return an array listing the events for which the emitter has registered listeners.</p><h4 id="returns-6" tabindex="-1">Returns <a class="header-anchor" href="#returns-6" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p>keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>[]</p><h3 id="findmagnetpoint" tabindex="-1">findMagnetPoint <a class="header-anchor" href="#findmagnetpoint" aria-label="Permalink to &quot;findMagnetPoint&quot;">​</a></h3><p>▸ <strong>findMagnetPoint</strong>(<code>magnets</code>, <code>textToMagnet</code>, <code>point</code>): <code>undefined</code> | <code>MagnetPoint</code></p><h4 id="parameters-4" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-4" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>magnets</code></td><td style="text-align:left;"><code>Point</code>[]</td></tr><tr><td style="text-align:left;"><code>textToMagnet</code></td><td style="text-align:left;"><a href="./../modules.html#text"><code>Text</code></a></td></tr><tr><td style="text-align:left;"><code>point</code></td><td style="text-align:left;"><code>Point</code></td></tr></tbody></table><h4 id="returns-7" tabindex="-1">Returns <a class="header-anchor" href="#returns-7" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>undefined</code> | <code>MagnetPoint</code></p><h3 id="getannotation" tabindex="-1">getAnnotation <a class="header-anchor" href="#getannotation" aria-label="Permalink to &quot;getAnnotation&quot;">​</a></h3><p>▸ <strong>getAnnotation</strong>(<code>id</code>): <code>undefined</code> | <a href="./../modules.html#arrow"><code>Arrow</code></a> | <a href="./../modules.html#text"><code>Text</code></a></p><p>Retrieve the annotation with the given id</p><h4 id="parameters-5" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-5" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>id</code></td><td style="text-align:left;"><a href="./../modules.html#id"><code>Id</code></a></td><td style="text-align:left;">the id of the annotation to get</td></tr></tbody></table><h4 id="returns-8" tabindex="-1">Returns <a class="header-anchor" href="#returns-8" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>undefined</code> | <a href="./../modules.html#arrow"><code>Arrow</code></a> | <a href="./../modules.html#text"><code>Text</code></a></p><p>The annotation with the given id</p><h3 id="getannotations" tabindex="-1">getAnnotations <a class="header-anchor" href="#getannotations" aria-label="Permalink to &quot;getAnnotations&quot;">​</a></h3><p>▸ <strong>getAnnotations</strong>(): <a href="./../interfaces/AnnotationCollection.html"><code>AnnotationCollection</code></a></p><h4 id="returns-9" tabindex="-1">Returns <a class="header-anchor" href="#returns-9" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><a href="./../interfaces/AnnotationCollection.html"><code>AnnotationCollection</code></a></p><p>the annotations in the controller</p><h3 id="getselected" tabindex="-1">getSelected <a class="header-anchor" href="#getselected" aria-label="Permalink to &quot;getSelected&quot;">​</a></h3><p>▸ <strong>getSelected</strong>(): <code>null</code> | <a href="./../modules.html#annotation"><code>Annotation</code></a></p><h4 id="returns-10" tabindex="-1">Returns <a class="header-anchor" href="#returns-10" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>null</code> | <a href="./../modules.html#annotation"><code>Annotation</code></a></p><p>the currently selected annotation</p><h3 id="listenercount" tabindex="-1">listenerCount <a class="header-anchor" href="#listenercount" aria-label="Permalink to &quot;listenerCount&quot;">​</a></h3><p>▸ <strong>listenerCount</strong>(<code>event</code>): <code>number</code></p><p>Return the number of listeners listening to a given event.</p><h4 id="parameters-6" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-6" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event</code></td><td style="text-align:left;">keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a></td></tr></tbody></table><h4 id="returns-11" tabindex="-1">Returns <a class="header-anchor" href="#returns-11" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>number</code></p><h3 id="listeners" tabindex="-1">listeners <a class="header-anchor" href="#listeners" aria-label="Permalink to &quot;listeners&quot;">​</a></h3><p>▸ <strong>listeners</strong>&lt;<code>T</code>&gt;(<code>event</code>): (...<code>args</code>: <code>ArgumentMap</code>&lt;<a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;[<code>Extract</code>&lt;<code>T</code>, keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;]) =&gt; <code>void</code>[]</p><p>Return the listeners registered for a given event.</p><h4 id="type-parameters-2" tabindex="-1">Type parameters <a class="header-anchor" href="#type-parameters-2" aria-label="Permalink to &quot;Type parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>T</code></td><td style="text-align:left;">extends keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a></td></tr></tbody></table><h4 id="parameters-7" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-7" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event</code></td><td style="text-align:left;"><code>T</code></td></tr></tbody></table><h4 id="returns-12" tabindex="-1">Returns <a class="header-anchor" href="#returns-12" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p>(...<code>args</code>: <code>ArgumentMap</code>&lt;<a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;[<code>Extract</code>&lt;<code>T</code>, keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;]) =&gt; <code>void</code>[]</p><h3 id="loadlink" tabindex="-1">loadLink <a class="header-anchor" href="#loadlink" aria-label="Permalink to &quot;loadLink&quot;">​</a></h3><p>▸ <strong>loadLink</strong>(<code>arrow</code>): <code>void</code></p><h4 id="parameters-8" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-8" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>arrow</code></td><td style="text-align:left;"><a href="./../modules.html#arrow"><code>Arrow</code></a></td></tr></tbody></table><h4 id="returns-13" tabindex="-1">Returns <a class="header-anchor" href="#returns-13" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>void</code></p><h3 id="off" tabindex="-1">off <a class="header-anchor" href="#off" aria-label="Permalink to &quot;off&quot;">​</a></h3><p>▸ <strong>off</strong>&lt;<code>T</code>&gt;(<code>event</code>, <code>fn?</code>, <code>context?</code>, <code>once?</code>): <code>this</code></p><h4 id="type-parameters-3" tabindex="-1">Type parameters <a class="header-anchor" href="#type-parameters-3" aria-label="Permalink to &quot;Type parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>T</code></td><td style="text-align:left;">extends keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a></td></tr></tbody></table><h4 id="parameters-9" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-9" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event</code></td><td style="text-align:left;"><code>T</code></td></tr><tr><td style="text-align:left;"><code>fn?</code></td><td style="text-align:left;">(...<code>args</code>: <code>ArgumentMap</code>&lt;<a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;[<code>Extract</code>&lt;<code>T</code>, keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;]) =&gt; <code>void</code></td></tr><tr><td style="text-align:left;"><code>context?</code></td><td style="text-align:left;"><code>any</code></td></tr><tr><td style="text-align:left;"><code>once?</code></td><td style="text-align:left;"><code>boolean</code></td></tr></tbody></table><h4 id="returns-14" tabindex="-1">Returns <a class="header-anchor" href="#returns-14" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="on" tabindex="-1">on <a class="header-anchor" href="#on" aria-label="Permalink to &quot;on&quot;">​</a></h3><p>▸ <strong>on</strong>&lt;<code>T</code>&gt;(<code>event</code>, <code>fn</code>, <code>context?</code>): <code>this</code></p><p>Add a listener for a given event.</p><h4 id="type-parameters-4" tabindex="-1">Type parameters <a class="header-anchor" href="#type-parameters-4" aria-label="Permalink to &quot;Type parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>T</code></td><td style="text-align:left;">extends keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a></td></tr></tbody></table><h4 id="parameters-10" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-10" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event</code></td><td style="text-align:left;"><code>T</code></td></tr><tr><td style="text-align:left;"><code>fn</code></td><td style="text-align:left;">(...<code>args</code>: <code>ArgumentMap</code>&lt;<a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;[<code>Extract</code>&lt;<code>T</code>, keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;]) =&gt; <code>void</code></td></tr><tr><td style="text-align:left;"><code>context?</code></td><td style="text-align:left;"><code>any</code></td></tr></tbody></table><h4 id="returns-15" tabindex="-1">Returns <a class="header-anchor" href="#returns-15" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="onupdate" tabindex="-1">onUpdate <a class="header-anchor" href="#onupdate" aria-label="Permalink to &quot;onUpdate&quot;">​</a></h3><p>▸ <strong>onUpdate</strong>(<code>annotation</code>): <code>void</code></p><p>Triggers the update event on the annotation</p><h4 id="parameters-11" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-11" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>annotation</code></td><td style="text-align:left;"><a href="./../modules.html#annotation"><code>Annotation</code></a></td><td style="text-align:left;">The annotation updated</td></tr></tbody></table><h4 id="returns-16" tabindex="-1">Returns <a class="header-anchor" href="#returns-16" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>void</code></p><h3 id="once" tabindex="-1">once <a class="header-anchor" href="#once" aria-label="Permalink to &quot;once&quot;">​</a></h3><p>▸ <strong>once</strong>&lt;<code>T</code>&gt;(<code>event</code>, <code>fn</code>, <code>context?</code>): <code>this</code></p><p>Add a one-time listener for a given event.</p><h4 id="type-parameters-5" tabindex="-1">Type parameters <a class="header-anchor" href="#type-parameters-5" aria-label="Permalink to &quot;Type parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>T</code></td><td style="text-align:left;">extends keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a></td></tr></tbody></table><h4 id="parameters-12" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-12" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event</code></td><td style="text-align:left;"><code>T</code></td></tr><tr><td style="text-align:left;"><code>fn</code></td><td style="text-align:left;">(...<code>args</code>: <code>ArgumentMap</code>&lt;<a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;[<code>Extract</code>&lt;<code>T</code>, keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;]) =&gt; <code>void</code></td></tr><tr><td style="text-align:left;"><code>context?</code></td><td style="text-align:left;"><code>any</code></td></tr></tbody></table><h4 id="returns-17" tabindex="-1">Returns <a class="header-anchor" href="#returns-17" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="refreshtextlinks" tabindex="-1">refreshTextLinks <a class="header-anchor" href="#refreshtextlinks" aria-label="Permalink to &quot;refreshTextLinks&quot;">​</a></h3><p>▸ <strong>refreshTextLinks</strong>(): <code>void</code></p><h4 id="returns-18" tabindex="-1">Returns <a class="header-anchor" href="#returns-18" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>void</code></p><h3 id="remove" tabindex="-1">remove <a class="header-anchor" href="#remove" aria-label="Permalink to &quot;remove&quot;">​</a></h3><p>▸ <strong>remove</strong>(<code>annotation</code>): <code>this</code></p><p>Remove an annotation or an array of annotations from the controller</p><h4 id="parameters-13" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-13" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>annotation</code></td><td style="text-align:left;"><a href="./../modules.html#arrow"><code>Arrow</code></a> | <a href="./../modules.html#text"><code>Text</code></a> | <a href="./../interfaces/AnnotationCollection.html"><code>AnnotationCollection</code></a></td><td style="text-align:left;">The annotation(s) to remove</td></tr></tbody></table><h4 id="returns-19" tabindex="-1">Returns <a class="header-anchor" href="#returns-19" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="removealllisteners" tabindex="-1">removeAllListeners <a class="header-anchor" href="#removealllisteners" aria-label="Permalink to &quot;removeAllListeners&quot;">​</a></h3><p>▸ <strong>removeAllListeners</strong>(<code>event?</code>): <code>this</code></p><p>Remove all listeners, or those of the specified event.</p><h4 id="parameters-14" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-14" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event?</code></td><td style="text-align:left;">keyof FeatureEvents</td></tr></tbody></table><h4 id="returns-20" tabindex="-1">Returns <a class="header-anchor" href="#returns-20" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="removelistener" tabindex="-1">removeListener <a class="header-anchor" href="#removelistener" aria-label="Permalink to &quot;removeListener&quot;">​</a></h3><p>▸ <strong>removeListener</strong>&lt;<code>T</code>&gt;(<code>event</code>, <code>fn?</code>, <code>context?</code>, <code>once?</code>): <code>this</code></p><p>Remove the listeners of a given event.</p><h4 id="type-parameters-6" tabindex="-1">Type parameters <a class="header-anchor" href="#type-parameters-6" aria-label="Permalink to &quot;Type parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>T</code></td><td style="text-align:left;">extends keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a></td></tr></tbody></table><h4 id="parameters-15" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-15" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>event</code></td><td style="text-align:left;"><code>T</code></td></tr><tr><td style="text-align:left;"><code>fn?</code></td><td style="text-align:left;">(...<code>args</code>: <code>ArgumentMap</code>&lt;<a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;[<code>Extract</code>&lt;<code>T</code>, keyof <a href="./../modules.html#featureevents"><code>FeatureEvents</code></a>&gt;]) =&gt; <code>void</code></td></tr><tr><td style="text-align:left;"><code>context?</code></td><td style="text-align:left;"><code>any</code></td></tr><tr><td style="text-align:left;"><code>once?</code></td><td style="text-align:left;"><code>boolean</code></td></tr></tbody></table><h4 id="returns-21" tabindex="-1">Returns <a class="header-anchor" href="#returns-21" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="select" tabindex="-1">select <a class="header-anchor" href="#select" aria-label="Permalink to &quot;select&quot;">​</a></h3><p>▸ <strong>select</strong>(<code>id</code>): <code>this</code></p><p>Selects the annotation with the given id</p><h4 id="parameters-16" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-16" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>id</code></td><td style="text-align:left;"><a href="./../modules.html#id"><code>Id</code></a></td><td style="text-align:left;">the id of the annotation to select</td></tr></tbody></table><h4 id="returns-22" tabindex="-1">Returns <a class="header-anchor" href="#returns-22" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="setoptions" tabindex="-1">setOptions <a class="header-anchor" href="#setoptions" aria-label="Permalink to &quot;setOptions&quot;">​</a></h3><p>▸ <strong>setOptions</strong>(<code>options?</code>): <a href="./../modules.html#controlleroptions"><code>ControllerOptions</code></a></p><p>Set the options for the controller</p><h4 id="parameters-17" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-17" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>options</code></td><td style="text-align:left;"><code>Partial</code>&lt;<a href="./../modules.html#controlleroptions"><code>ControllerOptions</code></a>&gt;</td><td style="text-align:left;">new Options</td></tr></tbody></table><h4 id="returns-23" tabindex="-1">Returns <a class="header-anchor" href="#returns-23" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><a href="./../modules.html#controlleroptions"><code>ControllerOptions</code></a></p><p>the updated options</p><h3 id="setscale" tabindex="-1">setScale <a class="header-anchor" href="#setscale" aria-label="Permalink to &quot;setScale&quot;">​</a></h3><p>▸ <strong>setScale</strong>(<code>id</code>, <code>scale</code>, <code>ox</code>, <code>oy</code>): <a href="./Control.html"><code>Control</code></a></p><h4 id="parameters-18" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-18" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>id</code></td><td style="text-align:left;"><a href="./../modules.html#id"><code>Id</code></a></td></tr><tr><td style="text-align:left;"><code>scale</code></td><td style="text-align:left;"><code>number</code></td></tr><tr><td style="text-align:left;"><code>ox</code></td><td style="text-align:left;"><code>number</code></td></tr><tr><td style="text-align:left;"><code>oy</code></td><td style="text-align:left;"><code>number</code></td></tr></tbody></table><h4 id="returns-24" tabindex="-1">Returns <a class="header-anchor" href="#returns-24" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><a href="./Control.html"><code>Control</code></a></p><h3 id="startarrow" tabindex="-1">startArrow <a class="header-anchor" href="#startarrow" aria-label="Permalink to &quot;startArrow&quot;">​</a></h3><p>▸ <strong>startArrow</strong>(<code>x</code>, <code>y</code>, <code>arrow?</code>): <code>void</code></p><p>Start adding an arrow (add it, and give control to the user)</p><h4 id="parameters-19" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-19" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>x</code></td><td style="text-align:left;"><code>number</code></td><td style="text-align:left;">coord of the first point</td></tr><tr><td style="text-align:left;"><code>y</code></td><td style="text-align:left;"><code>number</code></td><td style="text-align:left;">coord of the first point</td></tr><tr><td style="text-align:left;"><code>arrow?</code></td><td style="text-align:left;"><a href="./../modules.html#arrow"><code>Arrow</code></a></td><td style="text-align:left;">The arrow to add</td></tr></tbody></table><h4 id="returns-25" tabindex="-1">Returns <a class="header-anchor" href="#returns-25" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>void</code></p><h3 id="starttext" tabindex="-1">startText <a class="header-anchor" href="#starttext" aria-label="Permalink to &quot;startText&quot;">​</a></h3><p>▸ <strong>startText</strong>(<code>x</code>, <code>y</code>, <code>text?</code>): <code>void</code></p><p>Start adding a text (add it, and give control to the user)</p><h4 id="parameters-20" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-20" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>x</code></td><td style="text-align:left;"><code>number</code></td><td style="text-align:left;">coord of the top left point</td></tr><tr><td style="text-align:left;"><code>y</code></td><td style="text-align:left;"><code>number</code></td><td style="text-align:left;">coord of the top left point</td></tr><tr><td style="text-align:left;"><code>text?</code></td><td style="text-align:left;"><a href="./../modules.html#text"><code>Text</code></a></td><td style="text-align:left;">The text to add</td></tr></tbody></table><h4 id="returns-26" tabindex="-1">Returns <a class="header-anchor" href="#returns-26" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>void</code></p><h3 id="unselect" tabindex="-1">unselect <a class="header-anchor" href="#unselect" aria-label="Permalink to &quot;unselect&quot;">​</a></h3><p>▸ <strong>unselect</strong>(): <code>this</code></p><p>Unselects the currently selected annotation</p><h4 id="returns-27" tabindex="-1">Returns <a class="header-anchor" href="#returns-27" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p><h3 id="updatestyle" tabindex="-1">updateStyle <a class="header-anchor" href="#updatestyle" aria-label="Permalink to &quot;updateStyle&quot;">​</a></h3><p>▸ <strong>updateStyle</strong>&lt;<code>A</code>&gt;(<code>id</code>, <code>style</code>): <code>this</code></p><p>Update the style of the annotation with the given id</p><h4 id="type-parameters-7" tabindex="-1">Type parameters <a class="header-anchor" href="#type-parameters-7" aria-label="Permalink to &quot;Type parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th></tr></thead><tbody><tr><td style="text-align:left;"><code>A</code></td><td style="text-align:left;">extends <a href="./../modules.html#annotation"><code>Annotation</code></a></td></tr></tbody></table><h4 id="parameters-21" tabindex="-1">Parameters <a class="header-anchor" href="#parameters-21" aria-label="Permalink to &quot;Parameters&quot;">​</a></h4><table tabindex="0"><thead><tr><th style="text-align:left;">Name</th><th style="text-align:left;">Type</th><th style="text-align:left;">Description</th></tr></thead><tbody><tr><td style="text-align:left;"><code>id</code></td><td style="text-align:left;"><a href="./../modules.html#id"><code>Id</code></a></td><td style="text-align:left;">The id of the annotation to update</td></tr><tr><td style="text-align:left;"><code>style</code></td><td style="text-align:left;"><code>A</code>[<code>&quot;properties&quot;</code>][<code>&quot;style&quot;</code>]</td><td style="text-align:left;">The new style</td></tr></tbody></table><h4 id="returns-28" tabindex="-1">Returns <a class="header-anchor" href="#returns-28" aria-label="Permalink to &quot;Returns&quot;">​</a></h4><p><code>this</code></p>',206)]))}const m=t(d,[["render",l]]);export{f as __pageData,m as default};
