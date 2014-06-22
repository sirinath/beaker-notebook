/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package com.twosigma.beaker.groovy.rest;

import com.google.inject.Singleton;
import com.twosigma.beaker.jvm.object.SimpleEvaluationObject;
import groovy.lang.GroovyShell;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.ws.rs.FormParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpVersion;
import org.apache.http.client.fluent.Request;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.entity.ContentType;
import org.codehaus.groovy.control.CompilationFailedException;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

@Path("groovysh")
@Produces(MediaType.APPLICATION_JSON)
@Singleton
public class GroovyShellRest {

  private final Map<String, GroovyShell> shells = new HashMap<>();

  public GroovyShellRest() throws IOException {}

  private JSONParser parser = new JSONParser();

  @POST
  @Path("getShell")
  @Produces(MediaType.TEXT_PLAIN)
  public String getShell(
          @FormParam("shellId") String shellId) throws InterruptedException {
    // if the shell doesnot already exist, create a new shell
    if (shellId.isEmpty() || !this.shells.containsKey(shellId)) {
      shellId = UUID.randomUUID().toString();
      newEvaluator(shellId);
      return shellId;
    }
    return shellId;
  }

  @POST
  @Path("evaluate")
  public SimpleEvaluationObject evaluate(
      @FormParam("shellId") String shellId,
      @FormParam("code") String code,
      @FormParam("evalId") String evalId,
      @FormParam("sessionId") String sessionId) throws InterruptedException, IOException, ClientProtocolException, ParseException {

    long beginTime = new Date().getTime();



    String last = "null";
    List<String> _keys = new ArrayList<String>();
    List<Object> _out = new ArrayList<Object>();
    int thisIndex = -1;
    {
      String response = Request.Get("https://glaring-fire-5327.firebaseIO.com/" + sessionId + "/_evaluations.json")
        .useExpectContinue()
        .version(HttpVersion.HTTP_1_1)
        .connectTimeout(10000)
        .socketTimeout(10000)
        .execute().returnContent().asString();
      //System.out.println("\n\nevaluations = \n" + response);

      Object obj = this.parser.parse(response);
      JSONObject evaluators = (JSONObject) obj;
      Iterator iter = evaluators.entrySet().iterator();
      while (iter.hasNext()) {
        Map.Entry entry = (Map.Entry) iter.next();
        _keys.add((String) entry.getKey());
      }
      Collections.sort(_keys);
      //System.out.println("keys = [" + StringUtils.join(_keys, ", ") + "]");
      thisIndex = _keys.indexOf(evalId);
      //System.out.println("thisIndex = " + thisIndex);

      Iterator<String> it2 = _keys.iterator();
      while (it2.hasNext()) {
        JSONObject eval = (JSONObject) evaluators.get(it2.next());
        JSONObject output = (JSONObject) eval.get("output");
        //JSONObject result = (JSONObject) output.get("result");
        if (output.get("result") instanceof Number) {
          _out.add(output.get("result"));
        } else {
          _out.add(output.get("result").toString());
        }
      }
    }
    {
      String body = "{" +
          "\"begin_time\":" + beginTime + "," +
          "\"result\": \"evaluating\"" + "," +
          "\"evalId\":" + "\"" + evalId + "\"," +
          "\"eid\":" + thisIndex +
          "}";
      //System.out.println("body1 = \n" + body);
      String response = Request.Put("https://glaring-fire-5327.firebaseIO.com/" + sessionId + "/_evaluations/" + evalId + "/output.json")
        .useExpectContinue()
        .version(HttpVersion.HTTP_1_1)
        .bodyString(body, ContentType.DEFAULT_TEXT)
        .execute().returnContent().asString();
    }

    SimpleEvaluationObject obj = new SimpleEvaluationObject(code);
    obj.started();
    GroovyShell shell = getEvaluator(shellId);
    Object _last = (_out.size() > 1) ? _out.get(_out.size() - 2) : null;
    Map<String, Object> bk = new HashMap<String, Object>();
    bk.put("$_", _last);
    bk.put("_out", _out);
    shell.setVariable("bk", bk);
    shell.setVariable("bk_out", _out);
    shell.setVariable("bk_", _last);

    Object result;
    try {
//      String preEval = "bk=[$_:" + last + "]; thisIndex = " + thisIndex + "; "
//          + "keys = [\"" + StringUtils.join(_keys, "\", \"") + "\"];"
//          + "_out = [\"" + StringUtils.join(_out, "\", \"") + "\"];";
//      System.out.println("preEval\n" + preEval);
      //shell.evaluate(preEval);
      result = shell.evaluate(code);
    } catch (Exception e) {
      obj.error(e);
      return obj;
    }
    obj.finished(result);
    {
      if (!(result instanceof Number)) {
        result = "\"" + result + "\"";
      }
      long endTime = new Date().getTime();
      String body = "{" +
          "\"begin_time\":" + beginTime + "," +
          "\"result\": " + result + "" + "," +
          "\"evalId\":" + "\"" + evalId + "\"" + "," +
          "\"eid\":" + thisIndex + "," +
          "\"end_time\":" + "\"" + endTime + "\"" +
          "}";
      //System.out.println("body2 = \n" + body);
      String response = Request.Put("https://glaring-fire-5327.firebaseIO.com/" + sessionId + "/_evaluations/" + evalId + "/output.json")
        .useExpectContinue()
        .version(HttpVersion.HTTP_1_1)
        .bodyString(body, ContentType.DEFAULT_TEXT)
        .execute().returnContent().asString();
    }

    return obj;
  }

  @POST
  @Path("autocomplete")
  public List<String> autocomplete(
      @FormParam("shellId") String shellId,
      @FormParam("code") String code,
      @FormParam("caretPosition") int caretPosition) throws InterruptedException {
    return null;
  }

  @POST
  @Path("exit")
  public void exit(@FormParam("shellId") String shellId) {
  }

  @POST
  @Path("cancelExecution")
  public void cancelExecution(@FormParam("shellId") String shellId) {
  }

  @POST
  @Path("killAllThreads")
  public void killAllThreads(@FormParam("shellId") String shellId) {
  }

  @POST
  @Path("resetEnvironment")
  public void resetEnvironment(@FormParam("shellId") String shellId) {
  }

  @POST
  @Path("setClassPath")
  public void setClassPath(
      @FormParam("shellId") String shellId,
      @FormParam("classPath") String classPath) {
  }

  @POST
  @Path("setImports")
  public void setImports(
      @FormParam("shellId") String shellId,
      @FormParam("imports") String classPathes) {
  }

  private void newEvaluator(String id) {
    this.shells.put(id, new GroovyShell());
  }

  private GroovyShell getEvaluator(String shellId) {
    return this.shells.get(shellId);
  }
}
