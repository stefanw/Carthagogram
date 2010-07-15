echo "Using sprocketize (install via gem install sprocketize)"
sprocketize -C src/js cartogram.js > cartogrambuild.js
cd src/js
echo "Trying to closure compile with a compiler.jar placed in src/js"
java -jar compiler.jar  --js=cartogrambuild.js --js_output_file=cartogramcbuild.js
cd ../../