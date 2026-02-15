@src/app/_components/renderers/stego-text-only-renderer.tsx:61-67 use external link icon instead
can you set @public/background.jpg as the site background and everything else except for the side bar should be transpernt unless I explicity set a background to it
can you use @public/repeat.png instead but it's small so don't stretch it instead just repeat it
@src/app/_components/renderers/stego-text-only-renderer.tsx add a shadcn accordion and it's content should be json viewer of

          item.embedding.angleEmbedding.totalAnglesSelectedFirst

@src/app/_components/code-viewer.tsx not scrollable man
@src/app/_components/renderers/stego-text-only-renderer.tsx I want to show the results in sth like a table with pagination... but it's only one column because the search results are string[] @src/app/_components/renderers/stego-text-only-renderer.tsx:30-34 @src/app/_components/renderers/stego-text-only-renderer.tsx:187-189
move PaginatedTable to a dedicated table
and make the text wrap bacause results are long
add ui to change @src/app/_components/paginated-table.tsx pageSize

@src/app/_components/renderers/stego-text-only-renderer.tsx:171-177 use tanstack table and display this as table with three columns  with pagination
@src/app/_components/renderers/json-tree-renderer.tsx:119-121 can you console.log why there is no matching schema?!
write new renderer and schema for the @schema.json
@src/app/_components/renderers/stego-result-renderer.tsx can you show the compression ratio and references similar to the old stego-result
what is the difference between @schema.json and the two @src/schemas/stego-result-old.ts @src/schemas/stego-result.ts
add new schema and renderer for the @schema.json
add new schema and renderer for the @schema.json
can you add filename to the url search params
why doesn't @1look5n_v9.json fit the schema ?
check this "<http://localhost:3000/?filename=1look5n_v9.json>" it's still not getting parsed make the schema slightly less strict if possible...

@src/app/_components/renderers/stego-text-only-renderer.tsx:168-186 @src/app/_components/renderers/stego-result-renderer.tsx:238-256 can you please also showthe actual values ... doc is the index of the string in the following string[]
[selftext, ...search_results, ...comments]

idx is the index of the of the start of the slice
and len is the length of the slice

@src/server/api/routers/files.ts add tabs to the side bar and first tab reads from @src/server/api/routers/files.ts:7 and the other reads from ./output-results

full comment tree content should be collapsable if I click on a comment it's reply should show up by default only show top comments please

look the file names are ugly can you regex them and only show the id or maybe do a tree or sth?


             "1njs8qr_version_08_after_filtering_with_comments_1768104729413.json",
                    "1njs8qr_version_08_after_filtering_with_comments_1768105860890.json",
                    "1njs8qr_version_08_after_filtering_with_comments_1768106125770.json",
                    "1njs8qr_version_08_after_filtering_with_comments_1768106532619.json",
                    "1njs8qr_version_08_after_filtering_with_comments_1768106895019.json",
                    "1njs8qr_version_08_after_filtering_with_comments_1768109781707.json",
                    "1njs8qr_version_08_after_filtering_with_comments_1768110184009.json",
                    "1njs8qr_version_08_after_filtering_with_comments_1768110213039.json",
                    "1njs8qr_version_08_after_filtering_with_comments_1768111483902.json",
                    "1nlgzzu_version_07_after_filtering_with_comments.json",
                    "1nlyvxv_version_06_after_filtering_with_comments.json",
                    "1nlyvxv_version_07_after_filtering_with_comments.json",
                    "1nmeeqt_version_07_after_filtering_with_comments.json",
                    "1np0vsv_version_07_after_filtering_with_comments.json",
                    "1npb37u_version_02_after_filtering_with_comments.json",
I need to add a route for dashboard
the dashboard should have basic statistic on 
average bits per post
average compresssion ratio
and other metrics 
learn how to calcuate and get the values form the renderers components
the dashboard should have a route in the sidebar on the left
add route to the new dashboard